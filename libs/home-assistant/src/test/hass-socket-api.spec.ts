import { faker } from "@faker-js/faker";
import { Test } from "@steggy/testing";
import { DEFAULT_LIMIT, sleep, START } from "@steggy/utilities";
import WS from "ws";

import {
  BASE_URL,
  CRASH_REQUESTS_PER_SEC,
  TOKEN,
  WARN_REQUESTS_PER_SEC,
} from "../config";
import { HASSIO_WS_COMMAND } from "../contracts";
import { HomeAssistantModule } from "../modules";
import { ConnectionBuilderService, HassSocketAPIService } from "../services";
import { MockServerService, Next } from "./services";
import { SLEEP_SHORT } from "./types";

describe("Hass Socket API", () => {
  let base: string;
  let port: number;
  const token = faker.random.words(DEFAULT_LIMIT);
  const warnCount = 50;
  const crashCount = 100;

  let builder: ConnectionBuilderService;
  let socketApi: HassSocketAPIService;
  let next: Next;
  let mockServer: MockServerService;
  let socket: WS;

  beforeEach(async () => {
    port = await Test.getFreePort();
    base = `http://localhost:${port}`;
    const app = await Test.createTestingModule({
      bootstrap: {
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
      imports: [HomeAssistantModule],
      providers: [MockServerService, Next],
    }).compile();
    // local vars
    builder = app.get(ConnectionBuilderService);
    next = app.get(Next);
    socketApi = app.get(HassSocketAPIService);
    mockServer = app.get(MockServerService);

    // wire together socks with mock server
    builder.build = function () {
      socket = new WS(mockServer.url);
      return socket;
    }.bind(builder);
    mockServer.port = port;
    await mockServer.init();
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
   * Base URL is web url, websocket url needs to be calculated a bit
   */
  it("Should build websocket urls from base url", () => {
    const [prefix, suffix] = base.split("://");
    let ws = "ws";
    if (prefix.endsWith("s")) {
      ws += "s";
    }
    expect(builder["getUrl"]()).toBe(`${ws}://${suffix}/api/websocket`);
  });

  /**
   * Sanity check
   */
  it("Should correctly default CONNECTION_ACTIVE", () => {
    expect(socketApi.CONNECTION_ACTIVE).toBe(false);
  });

  /**
   * No connection, no message
   */
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

  /**
   * Verify throttle warning functionality
   */
  it("Will emit warnings if messages are sent too rapidly", async () => {
    expect(socketApi["WARN_REQUESTS"]).toBe(warnCount);
    jest.spyOn(socketApi["logger"], "warn");
    for (let i = START; i <= warnCount; i++) {
      socketApi["countMessage"]();
    }
    await sleep(SLEEP_SHORT);
    expect(socketApi["logger"].warn).toHaveBeenCalled();
  });

  /**
   * Verify self throttling functionality works, without actually calling `process.exit()`
   */
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

  /**
   * When the server responds with an `auth_required` message, forward the credentials from config
   */
  it("Will reply with auth when requested", async () => {
    const server = mockServer.nextConnection();
    await socketApi.init();
    const [connection, responses] = await server;
    mockServer.sendAuthRequired(connection);
    await next.message(connection);
    expect(responses).toContainEqual(
      expect.objectContaining({
        access_token: token,
        type: "auth",
      }),
    );
  });

  /**
   * `socketApi.sendMessage` should not return until it receives a reply to it's message.
   */
  it("Will wait for server reply by default when using sendMessage", async () => {
    const server = mockServer.nextConnection();
    await socketApi.init();
    const [connection, responses] = await server;
    let result: unknown;
    process.nextTick(async () => {
      result = await socketApi.sendMessage({
        type: HASSIO_WS_COMMAND.call_service,
      });
    });
    await sleep(SLEEP_SHORT);
    expect(result).toBeUndefined();
    const [message] = responses as { id: number }[];
    mockServer.sendResponse(connection, message.id, { foo: "bar" });
    await next.message(socket);
    expect(result).toBeDefined();
  });

  /**
   * `socketApi.sendMessage` should immediately (after account for node async weirdness) return a result when the 2nd arg is false
   *
   * Server response does not factor into the workflow
   */
  it("Can optionally fire and forget socket messages", async () => {
    const server = mockServer.nextConnection();
    await socketApi.init();
    await server;
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
