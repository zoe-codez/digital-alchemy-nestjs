import { Injectable } from "@nestjs/common";

import { Message } from "../types";
import { GotifyFetch } from "./gotify-fetch.service";

@Injectable()
export class GotifyMessageService {
  constructor(private readonly fetch: GotifyFetch) {}

  public async create(body: Message): Promise<Message> {
    return await this.fetch.fetch({
      body,
      method: "post",
      url: "/message",
    });
  }

  public async delete(id: number) {
    return await this.fetch.fetch({
      method: "delete",
      url: `/message/${id}`,
    });
  }

  public async deleteAll() {
    return await this.fetch.fetch({
      method: "delete",
      url: `/message`,
    });
  }

  public async list(): Promise<Message> {
    return await this.fetch.fetch({
      url: "/message",
    });
  }
}
