import { faker } from "@faker-js/faker";
import { LOG_LEVEL } from "@steggy/boilerplate";
import { Test } from "@steggy/testing";
import { DEFAULT_LIMIT, SECOND } from "@steggy/utilities";
import WS from "ws";

import {
  BASE_URL,
  CRASH_REQUESTS_PER_SEC,
  TOKEN,
  WARN_REQUESTS_PER_SEC,
} from "../config";
import { BackupResponse } from "../contracts";
import { HomeAssistantModule } from "../modules";
import {
  BackupService,
  ConnectionBuilderService,
  HassSocketAPIService,
} from "../services";
import { MockServerService } from "./services";

describe("Helpers", () => {
  let base: string;
  let port: number;
  const token = faker.random.words(DEFAULT_LIMIT);
  const buildSpy = jest.fn();
  const warnCount = 50;
  const crashCount = 100;

  let builder: ConnectionBuilderService;
  let socketApi: HassSocketAPIService;
  let backup: BackupService;
  let mockServer: MockServerService;
  let socket: WS;

  beforeAll(async () => {
    port = await Test.getFreePort();
    base = `http://localhost:${port}`;
  });

  afterAll(() => {
    mockServer.teardown();
  });

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      bootstrap: {
        config: {
          libs: {
            boilerplate: {
              [LOG_LEVEL]: "silent",
            },
            "home-assistant": {
              [BASE_URL]: base,
              [CRASH_REQUESTS_PER_SEC]: crashCount,
              [TOKEN]: token,
              [WARN_REQUESTS_PER_SEC]: warnCount,
            },
          },
        },
      },
      imports: [HomeAssistantModule],
      providers: [MockServerService],
    }).compile();
    builder = app.get(ConnectionBuilderService);
    backup = app.get(BackupService);

    // TODO: teardown and rebuild for completeness?
    if (!mockServer) {
      mockServer = app.get(MockServerService);
      mockServer.port = port;
      await mockServer.init();
    }

    builder.build = function () {
      buildSpy();
      socket = new WS(mockServer.url);
      return socket;
    }.bind(builder);
    socketApi = app.get(HassSocketAPIService);
  });

  afterEach(() => {
    if (socket) {
      socket.close();
      socket = undefined;
    }
  });

  describe("BackupService", () => {
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

    it("Can retrieve a list of current backups", async () => {
      const done = mockServer.nextConnection();
      await socketApi.init();
      const [connection] = await done;

      const listResult = backup.list();
      const data = await mockServer.nextMessage<{ id: string; type: string }>(
        connection,
      );
      expect(data.type).toBe("backup/info");
      connection.send(
        JSON.stringify({
          id: data.id,
          result: {
            backing_up: false,
            backups: BASIC_LIST,
          } as BackupResponse,
          type: "result",
        }),
      );
      const list = await listResult;
      expect(list).toEqual({
        backing_up: false,
        backups: BASIC_LIST,
      });
    });

    it("Can generate backups", async () => {
      const done = mockServer.nextConnection();
      await socketApi.init();
      const [connection] = await done;

      let started = false;
      let complete = false;
      connection.on("message", response => {
        const data = JSON.parse(response.toString());
        if (data.type !== "backup/info") {
          return;
        }
        // before the backup is started
        if (!started) {
          connection.send(
            JSON.stringify({
              id: data.id,
              result: { backing_up: false, backups: BASIC_LIST },
              type: "result",
            }),
          );
          started = true;
          return;
        }
        // the backup is started
        if (!complete) {
          connection.send(
            JSON.stringify({
              id: data.id,
              result: { backing_up: true, backups: BASIC_LIST },
              type: "result",
            }),
          );
          setTimeout(() => (complete = true), SECOND);
          return;
        }
        // the backup is done
        connection.send(
          JSON.stringify({
            id: data.id,
            result: {
              backing_up: false,
              backups: [...BASIC_LIST, BACKUP_COMPLETE],
            },
            type: "result",
          }),
        );
      });

      const result = await backup.generate();

      expect(result).toEqual(BACKUP_COMPLETE);
    });
  });
});
