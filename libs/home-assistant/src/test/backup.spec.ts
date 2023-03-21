import { faker } from "@faker-js/faker";
import { Test } from "@digital-alchemy/testing";
import { DEFAULT_LIMIT, SECOND } from "@digital-alchemy/utilities";
import { nextTick } from "process";
import WS from "ws";

import {
  BASE_URL,
  CRASH_REQUESTS_PER_SEC,
  TOKEN,
  WARN_REQUESTS_PER_SEC,
} from "../config";
import { HomeAssistantModule } from "../modules";
import {
  BackupService,
  ConnectionBuilderService,
  HassFetchAPIService,
  HassSocketAPIService,
} from "../services";
import { GenericServerMessage, MockServerService, Next } from "./services";

describe("Backup", () => {
  let base: string;
  let port: number;
  const token = faker.random.words(DEFAULT_LIMIT);
  const warnCount = 50;
  const crashCount = 100;
  const BASIC_LIST = [
    {
      date: "2022-11-03T16:39:57.425304-05:00",
      name: "Core 2022.10.5",
      path: "/config/backups/4d8b857e.tar",
      size: 73.08,
      slug: "4d8b857e",
    },
  ];
  const BACKUP_COMPLETE = {
    date: "2022-11-03T16:39:57.425304-05:01",
    name: "Core 2022.10.5",
    path: "/config/backups/4d8b857f.tar",
    size: 73.08,
    slug: "4d8b857f",
  };

  let builder: ConnectionBuilderService;
  let socketApi: HassSocketAPIService;
  let backup: BackupService;
  let fetch: HassFetchAPIService;
  let mockServer: MockServerService;
  let next: Next;
  let socket: WS;
  let connection: WS;

  beforeAll(async () => {
    port = await Test.getFreePort();
    base = `http://localhost:${port}`;
  });

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      bootstrap: {
        application: {
          config: {
            libs: {
              "home-assistant": {
                [BASE_URL]: base,
                [CRASH_REQUESTS_PER_SEC]: crashCount,
                [TOKEN]: token,
                [WARN_REQUESTS_PER_SEC]: warnCount,
              },
            },
          },
        },
      },
      imports: [HomeAssistantModule.forRoot()],
      providers: [MockServerService, Next],
    }).compile();
    // local vars
    builder = app.get(ConnectionBuilderService);
    backup = app.get(BackupService);
    next = app.get(Next);
    mockServer = app.get(MockServerService);
    fetch = app.get(HassFetchAPIService);
    socketApi = app.get(HassSocketAPIService);

    // wire together socks with mock server
    builder.build = function () {
      socket = new WS(mockServer.url);
      return socket;
    }.bind(builder);
    mockServer.port = port;
    await mockServer.init();

    // make available connection for easy access
    const server = mockServer.nextConnection();
    await socketApi.init();
    const [incoming] = await server;
    connection = incoming;
  });

  afterEach(() => {
    // Clean up sockets
    if (socket) {
      socket.close();
      socket = undefined;
    }
    mockServer.teardown();
    socketApi.destroy();
    mockServer = undefined;
  });

  /**
   * It's like a rest call, but through a websocket
   */
  it("Can retrieve a list of current backups", async () => {
    const listResult = backup.list();
    const message = await next.message<GenericServerMessage>(connection);
    expect(message.type).toBe("backup/info");
    mockServer.sendResponse(connection, message.id, {
      backing_up: false,
      backups: BASIC_LIST,
    });
    const list = await listResult;
    expect(list).toEqual({
      backing_up: false,
      backups: BASIC_LIST,
    });
  });

  /**
   * The generate method will generate a new backup, and return it's data.
   *
   * This is a multi-step process, involving polling to see when home assistant marks the backup as done.
   * Polling is done on a .5s interval
   */
  it("Can generate backups", async () => {
    let started = false;
    let complete = false;
    connection.on("message", response => {
      const message = JSON.parse(response.toString());
      if (message.type !== "backup/info") {
        return;
      }
      // before the backup is started
      if (!started) {
        mockServer.sendResponse(connection, message.id, {
          backing_up: false,
          backups: BASIC_LIST,
        });
        started = true;
        return;
      }
      // the backup is started
      if (!complete) {
        mockServer.sendResponse(connection, message.id, {
          backing_up: true,
          backups: BASIC_LIST,
        });
        // The "backing up" state will last 1 second
        // Long enough to ensure that it is sent at least once, maybe twice
        setTimeout(() => (complete = true), SECOND);
        return;
      }
      // the backup is done
      mockServer.sendResponse(connection, message.id, {
        backing_up: false,
        backups: [...BASIC_LIST, BACKUP_COMPLETE],
      });
    });

    const result = await backup.generate();
    expect(result).toEqual(BACKUP_COMPLETE);
  });

  /**
   * correctly calls download backup with expected path, and calls fetchService#download to pull it
   */
  it("Can pull backup .tar files to the local file system", async () => {
    // set up
    const spy = jest.fn();
    fetch["fetchService"].download = spy;
    const slug = "foo";
    const destination = "/tmp/backup.tar";
    // the content of the string shouldn't matter
    // a note for accuracy, the real one contains a jwt after the path
    const responsePath = "response/path";
    const path = `/api/backup/download/${slug}`;
    let complete: Promise<void>;

    // emit download request
    nextTick(async () => {
      complete = backup.download(slug, destination);
      await complete;
    });
    const message = await next.message(connection);
    expect(message).toEqual(
      expect.objectContaining({
        path,
        type: "auth/sign_path",
      }),
    );

    // respond back with a path
    mockServer.sendResponse(connection, message.id, {
      path: responsePath,
    });
    await complete;
    // use path to construct a download request
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: base,
        destination,
        url: responsePath,
      }),
    );
  });

  /**
   * Another "basically a rest call"
   */
  it("Can remove backups", async () => {
    const slug = "foo";
    await backup.remove(slug);
    const message = await next.message(connection);
    expect(message).toEqual(
      expect.objectContaining({
        slug,
        type: "backup/remove",
      }),
    );
  });
});
