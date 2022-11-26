import { Injectable } from "@nestjs/common";
import {
  AutoLogService,
  Cron,
  InjectConfig,
  InjectLogger,
} from "@steggy/boilerplate";
import { CronExpression, SECOND, sleep, START } from "@steggy/utilities";
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
  CONNECTION_RESET,
  DeviceListItemDTO,
  EntityListItemDTO,
  HA_EVENT_STATE_CHANGE,
  HassConfig,
  HassEvents,
  HASSIO_WS_COMMAND,
  HassNotificationDTO,
  HassSocketMessageTypes,
  SOCKET_MESSAGES,
  SOCKET_READY,
  SocketMessageDTO,
} from "../contracts";
import { ConnectionBuilderService } from "./connection-builder.service";
import { EntityManagerService } from "./entity-manager.service";
import { InterruptService } from "./interrupt.service";

@Injectable()
export class HASocketAPIService {
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
    private readonly interrupt: InterruptService,
    private readonly entityManager: EntityManagerService,
    private readonly builder: ConnectionBuilderService,
  ) {}

  public CONNECTION_ACTIVE = false;
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
  private connection: WS;
  private messageCount = START;
  private subscribeEvents = false;
  private subscriptionCallbacks = new Map<number, (result) => void>();
  private waitingCallback = new Map<number, (result) => void>();

  public async getAreas(): Promise<AreaDTO[]> {
    return await this.sendMessage({
      type: HASSIO_WS_COMMAND.area_list,
    });
  }

  public async getConfig(): Promise<HassConfig> {
    return await this.sendMessage({
      type: HASSIO_WS_COMMAND.get_config,
    });
  }

  public async getNotifications(): Promise<HassNotificationDTO[]> {
    return await this.sendMessage({
      type: HASSIO_WS_COMMAND.persistent_notification,
    });
  }

  /**
   * Set up a new websocket connection to home assistant
   */
  public async initConnection(reset = false): Promise<void> {
    if (reset) {
      this.eventEmitter.emit(CONNECTION_RESET);
      this.connection = undefined;
    }
    if (this.connection) {
      return;
    }
    this.logger.debug(`[CONNECTION_ACTIVE] = {false}`);
    this.CONNECTION_ACTIVE = false;
    try {
      this.messageCount = START;
      this.logger.info("Creating new socket connection");
      this.connection = this.builder.build();
      let first = true;
      this.connection.addEventListener("message", message => {
        if (first) {
          first = false;
          this.subscribeEvents = false;
          // this.logger.debug(`Hello message received`);
        }
        this.onMessage(JSON.parse(message.data.toString()));
      });
      this.connection.on("error", async error => {
        this.logger.error({ error: error.message || error }, "Socket error");
        if (!this.CONNECTION_ACTIVE) {
          await sleep(this.retryInterval);
          await this.initConnection(reset);
        }
      });

      return await new Promise(done => {
        this.connection.once("open", () => done());
      });
    } catch (error) {
      this.logger.error({ error }, `initConnection error`);
    }
  }

  public async listDevices(): Promise<DeviceListItemDTO[]> {
    return await this.sendMessage({
      type: HASSIO_WS_COMMAND.device_list,
    });
  }

  public async listEntities(): Promise<EntityListItemDTO[]> {
    return await this.sendMessage({
      type: HASSIO_WS_COMMAND.entity_list,
    });
  }

  public async renderTemplate(template: string): Promise<string> {
    return await this.sendMessage({
      template,
      timeout: this.renderTimeout,
      type: HASSIO_WS_COMMAND.render_template,
    });
  }

  /**
   * Send a message to HomeAssistant. Optionally, wait for a reply to come back & return
   */

  public async sendMessage<T extends unknown = unknown>(
    data: SOCKET_MESSAGES,
    waitForResponse = true,
    subscription?: () => void,
  ): Promise<T> {
    if (!this.connection) {
      this.logger.error("Cannot send messages before socket is initialized");
      return undefined;
    }
    this.countMessage();
    const counter = this.messageCount;
    if (data.type !== HASSIO_WS_COMMAND.auth) {
      // You want know how annoying this one was to debug?!
      data.id = counter;
    }
    if (this.connection?.readyState !== WS.OPEN) {
      this.logger.error(
        { data },
        `Cannot send message, connection is not open`,
      );
      return;
    }
    // Application has disallowed outgoing commands
    if (!this.interrupt.SOCKET && data.type !== HASSIO_WS_COMMAND.ping) {
      return;
    }
    const json = JSON.stringify(data);
    this.connection.send(json);
    if (subscription) {
      return data.id as T;
    }
    if (!waitForResponse) {
      return;
    }
    return new Promise(done => this.waitingCallback.set(counter, done));
  }

  public async updateEntity(
    entity: string,
    data: { name?: string; new_entity_id?: string },
  ): Promise<{ entity_entry: unknown }> {
    return await this.sendMessage({
      area_id: null,
      entity_id: entity,
      icon: null,
      name: data.name,
      new_entity_id: data.new_entity_id || entity,
      type: HASSIO_WS_COMMAND.entity_update,
    });
  }

  /**
   * Keep the running running count of recent messages
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  protected cleanup(): void {
    const now = Date.now();
    this.MESSAGE_TIMESTAMPS = this.MESSAGE_TIMESTAMPS.filter(
      time => time > now - SECOND,
    );
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  protected async ping(): Promise<void> {
    if (!this.CONNECTION_ACTIVE) {
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
    this.initConnection(true);
  }

  private countMessage(): void | never {
    this.messageCount++;
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
    switch (message.type as HassSocketMessageTypes) {
      case HassSocketMessageTypes.auth_required:
        this.logger.debug(`Sending authentication`);
        return await this.sendAuth();

      case HassSocketMessageTypes.auth_ok:
        this.logger.debug(`[CONNECTION_ACTIVE] = {true}`);
        // * Flag as valid connection
        this.CONNECTION_ACTIVE = true;
        clearTimeout(this.AUTH_TIMEOUT);
        // * Subscribe to updates
        if (!this.subscribeEvents) {
          this.subscribeEvents = true;
          this.logger.debug(`Subscribe events`);
          await this.sendMessage(
            { type: HASSIO_WS_COMMAND.subscribe_events },
            false,
          );
        }
        // * Announce done-ness
        this.logger.info("🏡 Home Assistant socket ready 🏡");
        this.eventEmitter.emit(SOCKET_READY);
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
        this.CONNECTION_ACTIVE = false;
        this.logger.fatal(message.message);
        return;

      default:
        // Code error probably
        this.logger.error(`Unknown websocket message type: ${message.type}`);
    }
  }

  private onMessageEvent(id: number, message: SocketMessageDTO) {
    if (message.event.event_type === HassEvents.state_changed) {
      this.entityManager.onEntityUpdate(message.event);
      if (this.interrupt.EVENTS) {
        this.eventEmitter.emit(HA_EVENT_STATE_CHANGE, message.event);
      }
    }
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
      // if (!this.caught) {
      //   this.logger.debug('pre-callback');
      // }
      f(message.result);
      // if (!this.caught) {
      //   this.logger.debug('post callback');
      // }
      // console.log("end");
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
