import { Injectable } from "@nestjs/common";

import { Application, ApplicationParameters, Message } from "../types";
import { GotifyFetch } from "./gotify-fetch.service";

@Injectable()
export class GotifyApplicationService {
  constructor(private readonly fetch: GotifyFetch) {}

  public async create(body: ApplicationParameters): Promise<Application> {
    return await this.fetch.fetch({
      body,
      method: "post",
      url: `/application`,
    });
  }

  public async delete(id: number): Promise<void> {
    return await this.fetch.fetch({
      method: "delete",
      url: `/application/${id}`,
    });
  }

  public async deleteMessages(id: number): Promise<void> {
    return await this.fetch.fetch({
      method: "delete",
      url: `/application/${id}/message`,
    });
  }

  public async getMessages(
    id: number,
    params?: { limit?: number; since?: number },
  ): Promise<Message[]> {
    return await this.fetch.fetch({
      params,
      url: `/application/${id}/message`,
    });
  }

  public async list(): Promise<Application[]> {
    return await this.fetch.fetch({
      url: `/application`,
    });
  }

  public async update(id: number, body: ApplicationParameters): Promise<Application> {
    return await this.fetch.fetch({
      body,
      method: "put",
      url: `/application/${id}`,
    });
  }

  // public async uploadAppImage(id: number, data: { file: File }) {
  //   this.request<Application, Error>({
  //     body: data,
  //     format: "json",
  //     method: "POST",
  //     path: `/application/${id}/image`,
  //     secure: true,
  //     type: ContentType.FormData,
  //     ...parameters,
  //   });
  // }
}
