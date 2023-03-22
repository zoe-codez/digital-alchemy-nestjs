import { faker } from "@faker-js/faker";
import { Test } from "@digital-alchemy/testing";
import { DEFAULT_LIMIT, sleep } from "@digital-alchemy/utilities";
import { nextTick } from "process";
import WS from "ws";

import { BASE_URL, TOKEN } from "../config";
import { HomeAssistantModule } from "../modules";
import {
  ConnectionBuilderService,
  EntityManagerService,
  HassSocketAPIService,
  SocketManagerService,
} from "../services";
import { CallProxyService } from "../services/call-proxy.service";
import { ON_SOCKET_AUTH } from "../types";
import { MockServerService, Next } from "./services";
import { SLEEP_SHORT } from "./types";

describe("Socket Manager", () => {
  let base: string;
  let port: number;
  const token = faker.random.words(DEFAULT_LIMIT);
  let builder: ConnectionBuilderService;
  let connection: WS;
  let entity: EntityManagerService;
  // let event: EventEmitter;
  let manager: SocketManagerService;
  let mockServer: MockServerService;
  let next: Next;
  let proxy: CallProxyService;
  let socket: WS;
  let socketApi: HassSocketAPIService;

  beforeEach(async () => {
    // Connection info for mock websocket server
    port = await Test.getFreePort();
    base = `http://localhost:${port}`;

    // Testing app
    const app = await Test.createTestingModule({
      bootstrap: {
        application: {
          config: {
            libs: {
              "home-assistant": {
                [BASE_URL]: base,
                [TOKEN]: token,
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
    entity = app.get(EntityManagerService);
    // event = app.get(EventEmitter);
    manager = app.get(SocketManagerService);
    mockServer = app.get(MockServerService);
    next = app.get(Next);
    proxy = app.get(CallProxyService);
    socketApi = app.get(HassSocketAPIService);

    manager.BUILD_PROXY = false;
    manager.SUBSCRIBE_EVENTS = false;

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

    // fully initialize the connection
    nextTick(async () => await mockServer.quickAuth(connection));
    await next.event(ON_SOCKET_AUTH);
  });

  afterEach(() => {
    // Clean up sockets
    if (socket) {
      socket.close();
      socket = undefined;
    }
    socketApi.destroy();
    mockServer.teardown();
    mockServer = undefined;
  });

  it("Will not initiate new connections if one is already active", async () => {
    jest.spyOn(socketApi, "init");
    await manager.connect();
    expect(socketApi.init).not.toHaveBeenCalled();
  });

  it("Will wait for full socket init before completing connect", async () => {
    await manager.disconnect();
    const server = mockServer.nextConnection();

    let resolved = false;
    nextTick(async () => {
      await manager.connect();
      resolved = true;
    });
    await sleep(SLEEP_SHORT);
    expect(resolved).toBe(false);
    const [incoming] = await server;
    nextTick(async () => await mockServer.quickAuth(incoming));
    await next.event(ON_SOCKET_AUTH);
    await sleep(SLEEP_SHORT);
    expect(resolved).toBe(true);
  });

  // it("Will not initialize proxy api if BUILD_PROXY = false", async () => {
  //   manager.BUILD_PROXY = false;
  //   proxy.initialize = jest.fn();
  //   await manager["onAuth"]();
  //   expect(proxy.initialize).not.toHaveBeenCalled();
  // });

  // it("Will initialize proxy api if BUILD_PROXY = true", async () => {
  //   manager.BUILD_PROXY = true;
  //   proxy.initialize = jest.fn();
  //   await manager["onAuth"]();
  //   expect(proxy.initialize).toHaveBeenCalled();
  // });

  it("Will not initialize entities api if SUBSCRIBE_EVENTS = false", async () => {
    manager.SUBSCRIBE_EVENTS = false;
    entity.refresh = jest.fn();
    await manager["onAuth"]();
    expect(entity.refresh).not.toHaveBeenCalled();
  });

  it("Will initialize entities api if SUBSCRIBE_EVENTS = true", async () => {
    manager.SUBSCRIBE_EVENTS = true;
    entity.refresh = jest.fn();
    await manager["onAuth"]();
    expect(entity.refresh).toHaveBeenCalled();
  });
});
