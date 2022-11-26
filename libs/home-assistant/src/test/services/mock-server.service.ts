import { Injectable } from "@nestjs/common";
import { Server, WebSocket } from "ws";

import { HassSocketMessageTypes } from "../../contracts";

@Injectable()
export class MockServerService {
  public port: number;
  private onNext: (data: [WebSocket, unknown[]]) => void;
  private server: Server;

  public get url(): string {
    return `ws://localhost:${this.port}`;
  }

  public init(): void {
    this.server = new Server({
      port: this.port,
    });

    this.server.on("connection", connection => {
      const responses: unknown[] = [];
      if (this.onNext) {
        this.onNext([connection, responses]);
      }
      connection.on("message", response => {
        const data = JSON.parse(response.toString());
        responses.push(data);
      });
    });
  }

  public nextConnection(): Promise<[WebSocket, unknown[]]> {
    return new Promise<[WebSocket, unknown[]]>(done => {
      this.onNext = done;
    });
  }

  public async nextMessage<T>(connection: WebSocket): Promise<T> {
    return await new Promise<T>(done => {
      connection.once("message", response => {
        done(JSON.parse(response.toString()));
      });
    });
  }

  public sendAuthOk(connection: WebSocket): void {
    connection.send(JSON.stringify({ type: HassSocketMessageTypes.auth_ok }));
  }

  public sendAuthRequired(connection: WebSocket): void {
    connection.send(
      JSON.stringify({ type: HassSocketMessageTypes.auth_required }),
    );
  }

  public teardown(): void {
    this.server.close();
  }
}
