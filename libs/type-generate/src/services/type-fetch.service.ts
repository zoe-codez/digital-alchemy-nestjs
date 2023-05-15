import { FetchService } from "@digital-alchemy/boilerplate";
import { FetchWith } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

import {
  CacheMetadata,
  FullCacheObject,
  TypeGenerateInterface,
} from "../types";

type FW = Omit<FetchWith, "baseUrl" | "headers">;

@Injectable()
export class TypeFetchService implements TypeGenerateInterface {
  constructor(private readonly fetchService: FetchService) {}

  public async deleteCache(id: string) {
    await this.fetch({
      method: `delete`,
      url: `/type-generate/cache/${id}`,
    });
  }

  public async fetch<T>(data: FW): Promise<T> {
    return await this.fetchService.fetch({ ...data });
  }

  public async inspectCache(id: string) {
    return await this.fetch<FullCacheObject>({
      url: `/type-generate/inspect/${id}`,
    });
  }

  public async listCacheMetadata() {
    return await this.fetch<CacheMetadata[]>({
      url: `/type-generate/list`,
    });
  }

  public async rebuild() {
    await this.fetch({
      method: `post`,
      url: `/type-generate/rebuild`,
    });
  }
  public async setCache(body: FullCacheObject) {
    await this.fetch({
      body,
      method: "post",
      url: `/type-generate/set-cache`,
    });
  }
}
