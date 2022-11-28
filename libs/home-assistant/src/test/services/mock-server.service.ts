import { Injectable } from "@nestjs/common";
import { Server, WebSocket } from "ws";

import { HassSocketMessageTypes } from "../../contracts";
import { Next } from "./next.service";

export type GenericServerMessage = { id: number; type: string };

@Injectable()
export class MockServerService {
  constructor(private readonly next: Next) {}
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

  public async quickAuth(connection: WebSocket) {
    connection.send(JSON.stringify({ type: "auth_required" }));
    await this.next.message(connection);
    connection.send(JSON.stringify({ type: "auth_ok" }));
  }

  public sendAuthOk(connection: WebSocket): void {
    connection.send(JSON.stringify({ type: HassSocketMessageTypes.auth_ok }));
  }

  public sendAuthRequired(connection: WebSocket): void {
    connection.send(
      JSON.stringify({ type: HassSocketMessageTypes.auth_required }),
    );
  }

  public sendResponse(connection: WebSocket, id: number, result: object) {
    connection.send(
      JSON.stringify({
        id,
        result,
        type: "result",
      }),
    );
  }

  public teardown(): void {
    this.server.close();
    this.server = undefined;
  }
}
