import {
  AutoLogService,
  InjectConfig,
  InjectLogger,
} from "@digital-alchemy/boilerplate";
import { SECOND, sleep, START } from "@digital-alchemy/utilities";
import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import EventEmitter from "eventemitter3";
import { exit } from "process";
import WS from "ws";

import {
  CRASH_REQUESTS_PER_SEC,
  RENDER_TIMEOUT,
  RETRY_INTERVAL,
  TOKEN,
  WARN_REQUESTS_PER_SEC,
} from "../config";
import {
  AreaDTO,
  HASS_WEBSOCKET_RECEIVE_MESSAGE,
  HASS_WEBSOCKET_SEND_MESSAGE,
  HassConfig,
  HASSIO_WS_COMMAND,
  HassSocketMessageTypes,
  HassWebsocketReceiveMessageData,
  HassWebsocketSendMessageData,
  ON_SOCKET_AUTH,
  SOCKET_MESSAGES,
  SocketMessageDTO,
} from "../types";
import { SocketManagerService } from "./socket-manager.service";
import { ConnectionBuilderService, EventManagerService } from "./utilities";

const CONNECTION_OPEN = 1;
let connection: WS;
let CONNECTION_ACTIVE = false;
let messageCount = START;
const CLEANUP_INTERVAL = 5;
const PING_INTERVAL = 10;

/**
 * Management for
 */
@Injectable()
export class HassSocketAPIService {
  constructor(
    @InjectLogger()
    private readonly logger: AutoLogService,
    private readonly eventEmitter: EventEmitter,
    @InjectConfig(TOKEN)
    private readonly token: string,
    @InjectConfig(WARN_REQUESTS_PER_SEC) private readonly WARN_REQUESTS: number,
    @InjectConfig(CRASH_REQUESTS_PER_SEC)
    private readonly CRASH_REQUESTS: number,
    @InjectConfig(RENDER_TIMEOUT) private readonly renderTimeout: number,
    @InjectConfig(RETRY_INTERVAL) private readonly retryInterval: number,
    private readonly eventManager: EventManagerService,
    private readonly builder: ConnectionBuilderService,
    @Inject(forwardRef(() => SocketManagerService))
    private readonly manager: SocketManagerService,
  ) {}

  public get CONNECTION_ACTIVE() {
    return CONNECTION_ACTIVE;
  }

  public get connection() {
    return connection;
  }

  private AUTH_TIMEOUT: ReturnType<typeof setTimeout>;

  /**
   * Tracking for recent message traffic.
   * Helps to ensure that the application doesn't go out of control in an infinite loop somewhere.
   *
   * This array will keep track of all messages over a X time period, ensuring it doesn't exceed an average rate (configurable).
   * If rate is exceeded, a warning will be emitted.
   * If rate is significantly exceeded, application will terminate with a fatal error.
   *
   * ---
   *
   * This is a safety feature, intended to stop foot gun scenarios.
   * If a use case requires a lot of traffic to be sent very quickly, then increase the configuration variable values.
   *
   * ---
   *
   * There's probably a better strategy for dealing with this, maybe a moving average of some sort.
   * Will track down a strategy later, if it bothers me.
   * Open an issue if you have thoughts
   */
  private MESSAGE_TIMESTAMPS: number[] = [];
  private subscriptionCallbacks = new Map<number, (result) => void>();
  private waitingCallback = new Map<number, (result) => void>();

  public destroy(): void {
    if (!connection) {
      return;
    }
    if (connection.readyState === CONNECTION_OPEN) {
      this.logger.debug(`Closing current connection`);
      CONNECTION_ACTIVE = false;
      connection.close();
    }
    connection = undefined;
  }

  /**
   * @deprecated To be moved somewhere else more appropriate in the near future
   */
  public async getAreas(): Promise<AreaDTO[]> {
    return await this.sendMessage({
      type: HASSIO_WS_COMMAND.area_list,
    });
  }

  /**
   * @deprecated To be moved somewhere else more appropriate in the near future
   */
  public async getConfig(): Promise<HassConfig> {
    return await this.sendMessage({
      type: HASSIO_WS_COMMAND.get_config,
    });
  }

  /**
   * Set up a new websocket connection to home assistant
   */
  public async init(): Promise<void> {
    if (connection) {
      throw new InternalServerErrorException(
        `Destroy the current connection before creating a new one`,
      );
    }
    this.logger.debug(`[CONNECTION_ACTIVE] = {false}`);
    CONNECTION_ACTIVE = false;
    try {
      messageCount = START;
      connection = this.builder.build();
      connection.on("message", message => {
        this.onMessage(JSON.parse(message.toString()));
      });
      connection.on("error", async error => {
        this.logger.error({ error: error.message || error }, "Socket error");
        if (!CONNECTION_ACTIVE) {
          await sleep(this.retryInterval);
          this.destroy();
          await this.init();
        }
      });
      return await new Promise(done => {
        connection.once("open", () => done());
      });
    } catch (error) {
      this.logger.error(
        { error, url: this.builder.getUrl() },
        `initConnection error`,
      );
    }
  }

  /**
   * @deprecated To be moved somewhere else more appropriate in the near future
   */
  public async renderTemplate(template: string): Promise<string> {
    return await this.sendMessage({
      template,
      timeout: this.renderTimeout,
      type: HASSIO_WS_COMMAND.render_template,
    });
  }

  /**
   * Send a message to HomeAssistant. Optionally, wait for a reply to return the result from
   */
  public async sendMessage<RESPONSE_VALUE extends unknown = unknown>(
    data: SOCKET_MESSAGES,
    waitForResponse = true,
    subscription?: () => void,
  ): Promise<RESPONSE_VALUE> {
    if (!connection) {
      this.logger.error("Cannot send messages before socket is initialized");
      return undefined;
    }
    this.countMessage();
    this.eventEmitter.emit(HASS_WEBSOCKET_SEND_MESSAGE, {
      type: data.type,
    } as HassWebsocketSendMessageData);
    if (data.type !== HASSIO_WS_COMMAND.auth) {
      // You want know how annoying this one was to debug?!
      data.id = messageCount;
    }
    if (connection?.readyState !== WS.OPEN) {
      this.logger.error(
        { data },
        `Cannot send message, connection is not open`,
      );
      return;
    }
    const json = JSON.stringify(data);
    connection.send(json);
    if (subscription) {
      return data.id as RESPONSE_VALUE;
    }
    if (!waitForResponse) {
      return;
    }
    return new Promise<RESPONSE_VALUE>(done =>
      this.waitingCallback.set(messageCount, done),
    );
  }

  /**
   * Keep the running running count of recent messages
   */
  protected cleanup(): void {
    const now = Date.now();
    this.MESSAGE_TIMESTAMPS = this.MESSAGE_TIMESTAMPS.filter(
      time => time > now - SECOND,
    );
  }

  protected onModuleInit() {
    // Don't use cron to set these up, it's overkill
    setInterval(() => this.cleanup(), CLEANUP_INTERVAL * SECOND);
    setInterval(async () => await this.ping(), PING_INTERVAL * SECOND);
  }

  protected async ping(): Promise<void> {
    if (!CONNECTION_ACTIVE) {
      return;
    }
    try {
      const pong = await this.sendMessage({
        type: HASSIO_WS_COMMAND.ping,
      });
      if (pong) {
        return;
      }
      // Tends to happen when HA resets
      // Resolution is to re-connect when it's up again
      this.logger.error(`Failed to pong!`);
    } catch (error) {
      this.logger.error({ error }, `ping error`);
    }
    this.destroy();
    this.init();
  }

  private countMessage(): void | never {
    messageCount++;
    const now = Date.now();
    this.MESSAGE_TIMESTAMPS.push(now);
    const count = this.MESSAGE_TIMESTAMPS.filter(
      time => time > now - SECOND,
    ).length;
    if (count > this.CRASH_REQUESTS) {
      this.logger.fatal(
        `FATAL ERROR: Exceeded {CRASH_REQUESTS_PER_MIN} threshold.`,
      );
      this.die();
    }
    if (count > this.WARN_REQUESTS) {
      this.logger.warn(
        `Message traffic ${this.CRASH_REQUESTS}>${count}>${this.WARN_REQUESTS}`,
      );
    }
  }

  /**
   * extracted for unit testing
   */
  private die() {
    exit();
  }

  /**
   * Called on incoming message.
   * Intended to interpret the basic concept of the message,
   * and route it to the correct callback / global channel / etc
   *
   * ## auth_required
   * Hello message from server, should reply back with an auth msg
   * ## auth_ok
   * Follow up with a request to receive all events, and request a current state listing
   * ## event
   * Something updated it's state
   * ## pong
   * Reply to outgoing ping()
   * ## result
   * Response to an outgoing emit
   */
  private async onMessage(message: SocketMessageDTO) {
    const id = Number(message.id);
    this.eventEmitter.emit(HASS_WEBSOCKET_RECEIVE_MESSAGE, {
      type: message.type,
    } as HassWebsocketReceiveMessageData);
    switch (message.type as HassSocketMessageTypes) {
      case HassSocketMessageTypes.auth_required:
        this.logger.debug(`Sending authentication`);
        return await this.sendAuth();

      case HassSocketMessageTypes.auth_ok:
        this.logger.debug(`[CONNECTION_ACTIVE] = {true}`);
        // * Flag as valid connection
        CONNECTION_ACTIVE = true;
        clearTimeout(this.AUTH_TIMEOUT);
        // 🕶
        await this.manager["onAuth"]();
        this.eventEmitter.emit(ON_SOCKET_AUTH);
        return;

      case HassSocketMessageTypes.event:
        return await this.onMessageEvent(id, message);

      case HassSocketMessageTypes.pong:
        // 🏓
        if (this.waitingCallback.has(id)) {
          const f = this.waitingCallback.get(id);
          this.waitingCallback.delete(id);
          f(message);
        }
        return;

      case HassSocketMessageTypes.result:
        return await this.onMessageResult(id, message);

      case HassSocketMessageTypes.auth_invalid:
        this.logger.debug(`[CONNECTION_ACTIVE] = {false}`);
        CONNECTION_ACTIVE = false;
        this.logger.fatal(message.message);
        return;

      default:
        // Code error probably
        this.logger.error(`Unknown websocket message type: ${message.type}`);
    }
  }

  private onMessageEvent(id: number, message: SocketMessageDTO) {
    this.eventManager.onMessage(message);
    if (this.waitingCallback.has(id)) {
      const f = this.waitingCallback.get(id);
      this.waitingCallback.delete(id);
      f(message.event.result);
    }
    if (this.subscriptionCallbacks.has(id)) {
      const f = this.subscriptionCallbacks.get(id);
      f(message.event.result);
    }
  }

  private onMessageResult(id: number, message: SocketMessageDTO) {
    if (this.waitingCallback.has(id)) {
      if (message.error) {
        this.logger.error({ message });
      }

      const f = this.waitingCallback.get(id);
      this.waitingCallback.delete(id);
      f(message.result);
    }
  }

  private async sendAuth(): Promise<void> {
    this.AUTH_TIMEOUT = setTimeout(() => {
      this.logger.error(`Did not receive an auth response, retrying`);
      this.sendAuth();
    }, this.retryInterval);
    await this.sendMessage({
      access_token: this.token,
      type: HASSIO_WS_COMMAND.auth,
    });
  }
}
