import { faker } from "@faker-js/faker";
import { LOG_LEVEL } from "@steggy/boilerplate";
import { Test } from "@steggy/testing";
import { DEFAULT_LIMIT, sleep, START } from "@steggy/utilities";
import WS from "ws";

import {
  BASE_URL,
  CRASH_REQUESTS_PER_SEC,
  TOKEN,
  WARN_REQUESTS_PER_SEC,
} from "../config";
import { HASSIO_WS_COMMAND, HassSocketMessageTypes } from "../contracts";
import { HomeAssistantModule } from "../modules";
import { ConnectionBuilderService, HASocketAPIService } from "../services";
import { MockServerService } from "./services";

/**
 * This number may need to be tweaked in the future.
 * It is chosen as a reasonable delay for the websocket to properly establish a connection to localhost.
 * Results were pretty intermittent in some tets using `10`.
 */
const SLEEP_SHORT = 100;

describe("SocketApi", () => {
  let base: string;
  let port: number;
  const token = faker.random.words(DEFAULT_LIMIT);
  const buildSpy = jest.fn();
  const warnCount = 50;
  const crashCount = 100;

  let builder: ConnectionBuilderService;
  let socketApi: HASocketAPIService;
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
    socketApi = app.get(HASocketAPIService);
  });

  afterEach(() => {
    if (socket) {
      socket.close();
      socket = undefined;
    }
  });

  it("Should build websocket urls from base url", () => {
    const [prefix, suffix] = base.split("://");
    let ws = "ws";
    if (prefix.endsWith("s")) {
      ws += "s";
    }
    expect(builder["getUrl"]()).toBe(`${ws}://${suffix}/api/websocket`);
  });

  it("Should correctly default CONNECTION_ACTIVE", () => {
    expect(socketApi.CONNECTION_ACTIVE).toBe(false);
  });

  it("Should prevent messages from being send prior to initialization", async () => {
    const logSpy = jest.spyOn(socketApi["logger"], "error");
    const nextSpy = jest.fn();
    socketApi["countMessage"] = nextSpy;
    // @ts-expect-error body not needed here
    await socketApi.sendMessage({});
    expect(logSpy).toHaveBeenCalledWith(
      "Cannot send messages before socket is initialized",
    );
    expect(nextSpy).not.toHaveBeenCalled();
  });

  it("Will emit warnings if messages are sent too rapidly", async () => {
    expect(socketApi["WARN_REQUESTS"]).toBe(warnCount);
    jest.spyOn(socketApi["logger"], "warn");
    for (let i = START; i <= warnCount; i++) {
      socketApi["countMessage"]();
    }
    await sleep(SLEEP_SHORT);
    expect(socketApi["logger"].warn).toHaveBeenCalled();
  });

  it("Will commit sudoku if messages are sent even faster", async () => {
    expect(socketApi["CRASH_REQUESTS"]).toBe(crashCount);
    jest.spyOn(socketApi["logger"], "fatal");
    const sudoku = jest.fn();
    socketApi["die"] = sudoku;
    for (let i = START; i <= crashCount; i++) {
      socketApi["countMessage"]();
    }
    await sleep(SLEEP_SHORT);
    expect(socketApi["logger"].fatal).toHaveBeenCalled();
    expect(sudoku).toHaveBeenCalled();
  });

  it("Will reply with auth when requested", async () => {
    const done = mockServer.nextConnection();
    await socketApi.initConnection();
    const [connection, responses] = await done;
    mockServer.sendAuthRequired(connection);
    await sleep(SLEEP_SHORT);
    expect(responses).toContainEqual(
      expect.objectContaining({
        access_token: token,
        type: "auth",
      }),
    );
  });

  it("Will subscribe to events after receiving auth_ok", async () => {
    const done = mockServer.nextConnection();
    await socketApi.initConnection();
    const [connection, responses] = await done;
    mockServer.sendAuthOk(connection);
    await sleep(SLEEP_SHORT);
    expect(responses).toContainEqual(
      expect.objectContaining({
        type: "subscribe_events",
      }),
    );
  });

  it("Will wait for server reply by default", async () => {
    const done = mockServer.nextConnection();
    await socketApi.initConnection();
    const [connection, responses] = await done;
    let result: unknown;
    process.nextTick(async () => {
      result = await socketApi.sendMessage({
        type: HASSIO_WS_COMMAND.call_service,
      });
    });
    await sleep(SLEEP_SHORT);
    expect(result).toBeUndefined();
    const [message] = responses as { id: number }[];
    connection.send(
      JSON.stringify({
        id: message.id,
        result: { foo: "bar" },
        type: HassSocketMessageTypes.result,
      }),
    );
    await sleep(SLEEP_SHORT);
    expect(result).toBeDefined();
  });

  it("Can conditionally return after sending message", async () => {
    const done = mockServer.nextConnection();
    await socketApi.initConnection();
    await done;
    const NO_RESULT = Symbol();
    let result: unknown = NO_RESULT;
    process.nextTick(async () => {
      result = await socketApi.sendMessage(
        {
          type: HASSIO_WS_COMMAND.call_service,
        },
        false,
      );
    });
    await sleep(SLEEP_SHORT);
    expect(result).not.toBe(NO_RESULT);
  });
});
