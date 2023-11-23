import { FetchService, InjectConfig } from "@digital-alchemy/boilerplate";
import { is } from "@digital-alchemy/utilities";
import {
  Injectable,
  InternalServerErrorException,
  Scope,
} from "@nestjs/common";
import EventEmitter from "eventemitter3";

import { BASE_URL, CHANNEL_MAPPING } from "../config";
import {
  GOTIFY_NOTIFICATION_SENT,
  GotifyNotificationSentData,
  Message,
} from "../types";

/**
 * Use `@SendFrom` to bind message sending to configuration
 */
@Injectable({ scope: Scope.TRANSIENT })
export class GotifyNotify {
  constructor(
    @InjectConfig(BASE_URL) private readonly base: string,
    @InjectConfig(CHANNEL_MAPPING)
    private readonly channels: Record<string, string>,
    private readonly fetch: FetchService,
    private readonly event: EventEmitter,
  ) {}

  private application: string;

  public async send(body: Message, context: string): Promise<void> {
    const token = this.channels[this.application];
    if (is.empty(token)) {
      throw new InternalServerErrorException(
        `Bad application channel: ${this.application}`,
      );
    }
    body.extras = {
      // "home::appliances::lighting::on": { brightness: 15 },
      // "home::appliances::thermostat::change_temperature": { temperature: 23 },
    };
    this.event.emit(GOTIFY_NOTIFICATION_SENT, {
      application: this.application,
      context,
    } as GotifyNotificationSentData);
    return await this.fetch.fetch({
      baseUrl: this.base,
      body,
      headers: { ["X-Gotify-Key"]: token },
      method: "post",
      url: "/message",
    });
  }
}
