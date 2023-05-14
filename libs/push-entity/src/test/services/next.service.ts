import { Injectable } from "@nestjs/common";
import EventEmitter from "eventemitter3";
import { nextTick } from "process";
import { WebSocket } from "ws";

import { GenericServerMessage } from "./mock-server.service";

@Injectable()
export class Next {
  constructor(private readonly eventEmitter: EventEmitter) {}

  public async event(event: string): Promise<void> {
    return await new Promise(done =>
      this.eventEmitter.once(event, () => done()),
    );
  }

  public async message<T extends GenericServerMessage = GenericServerMessage>(
    connection: WebSocket,
  ): Promise<T> {
    return await new Promise<T>(done => {
      connection.once("message", response => {
        nextTick(() => done(JSON.parse(response.toString())));
      });
    });
  }
}
