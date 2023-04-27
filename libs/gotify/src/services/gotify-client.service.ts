import { Injectable } from "@nestjs/common";

import { Client } from "../types";
import { GotifyFetch } from "./gotify-fetch.service";

@Injectable()
export class GotifyClientService {
  constructor(private readonly fetch: GotifyFetch) {}

  public async create(body: Client): Promise<Client> {
    return await this.fetch.fetch({
      body,
      method: "post",
      url: "/client",
    });
  }

  public async delete(id: number) {
    return await this.fetch.fetch({
      method: "delete",
      url: `/client/${id}`,
    });
  }

  public async list(): Promise<Client> {
    return await this.fetch.fetch({
      url: "/client",
    });
  }

  public async update(id: number, body: Client): Promise<Client> {
    return await this.fetch.fetch({
      body,
      method: "put",
      url: `/client/${id}`,
    });
  }
}
