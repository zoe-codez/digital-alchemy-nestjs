import { Injectable } from "@nestjs/common";

/**
 * Centralized resource for controlling how home assistant interacts with the larger application
 */
@Injectable()
export class InterruptService {
  /**
   * Allow entity update events.
   *
   * Entity manager will still be maintained as accurate.
   */
  public EVENTS = true;

  /**
   * Allow calls through the dynamic service proxy (`iCallService`).
   *
   * Disabling will still allow calls through the websocket
   */
  public PROXY = true;

  /**
   * Allow outgoing commands from the socket.
   *
   * Disabling will still not stop incoming events.
   * Implies `PROXY=false`
   */
  public SOCKET = true;
}
