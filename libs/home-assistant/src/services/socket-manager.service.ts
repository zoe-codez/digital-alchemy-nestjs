import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import EventEmitter from "eventemitter3";

import { HASSIO_WS_COMMAND, SOCKET_READY } from "../types";
import { HassSocketAPIService } from "./hass-socket-api.service";
import { EntityManagerService } from "./utilities";

/**
 * High level management for the Home Assistant websocket.
 * Block traffic, initialize connections, manage events, etc.
 */
@Injectable()
export class SocketManagerService {
  constructor(
    @Inject(forwardRef(() => HassSocketAPIService))
    private readonly socket: HassSocketAPIService,
    private readonly logger: AutoLogService,
    private readonly entity: EntityManagerService,
    private readonly eventEmitter: EventEmitter,
  ) {}

  /**
   * Enable the websocket proxy api
   *
   * ? Referenced by `CallProxyService`, which builds proxy objects
   */
  public BUILD_PROXY = true;

  /**
   * Automatically subscribe to event updates on connect
   */
  public SUBSCRIBE_EVENTS = true;

  /**
   * Connect the websocket to home assistant
   */
  public async connect(): Promise<void> {
    if (this.socket.CONNECTION_ACTIVE) {
      this.logger.error(`Socket connection is already active`);
      return;
    }
    this.logger.warn("Creating new socket connection");
    await this.socket.init();
    await new Promise<void>(done =>
      this.eventEmitter.once(SOCKET_READY, () => done()),
    );
  }

  /**
   * Tear town the socket connection
   */
  public disconnect(): void {
    this.socket.destroy();
  }

  /**
   * semi-hidden method
   */
  protected async onAuth(): Promise<void> {
    // * Init internal workflows first
    await this.subscribeEvents();
    // TODO: registry subscriptions
    // * Open up to the larger application
    this.logger.info("🏡 Home Assistant socket ready 🏡");
    this.eventEmitter.emit(SOCKET_READY);
  }

  /**
   * Subscribe to entity updates
   */
  private async subscribeEvents(): Promise<void> {
    if (!this.SUBSCRIBE_EVENTS) {
      this.logger.debug(`[Event Subscriptions] skipping`);
      return;
    }
    this.logger.debug(`[Event Subscriptions] starting`);
    await this.entity.refresh();
    await this.socket.sendMessage(
      { type: HASSIO_WS_COMMAND.subscribe_events },
      false,
    );
  }
}
