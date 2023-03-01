import { Injectable } from "@nestjs/common";
import { InjectConfig } from "@steggy/boilerplate";
import WS from "ws";

import { BASE_URL, WEBSOCKET_URL } from "../../config";

@Injectable()
export class ConnectionBuilderService {
  constructor(
    @InjectConfig(BASE_URL)
    private readonly baseUrl: string,
    @InjectConfig(WEBSOCKET_URL) private readonly websocketUrl: string,
  ) {}

  public build() {
    return new WS(this.getUrl());
  }

  public getUrl() {
    const url = new URL(this.baseUrl);
    return (
      this.websocketUrl ||
      `${url.protocol === `http:` ? `ws:` : `wss:`}//${url.hostname}${
        url.port ? `:${url.port}` : ``
      }/api/websocket`
    );
  }
}
