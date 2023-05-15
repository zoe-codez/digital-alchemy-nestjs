import { InjectConfig } from "@digital-alchemy/boilerplate";
import { Injectable } from "@nestjs/common";
import WS from "ws";

import { BASE_URL, WEBSOCKET_URL } from "../config";

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
    const protocol = url.protocol === `http:` ? `ws:` : `wss:`;
    return (
      this.websocketUrl ||
      `${protocol}//${url.hostname}${
        url.port ? `:${url.port}` : ``
      }/api/websocket`
    );
  }
}
