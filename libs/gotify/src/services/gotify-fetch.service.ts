import { FetchService, InjectConfig } from "@digital-alchemy/boilerplate";
import { FilteredFetchArguments } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

import { BASE_URL, TOKEN } from "../config";

@Injectable()
export class GotifyFetch {
  constructor(
    private readonly fetchService: FetchService,
    @InjectConfig(BASE_URL)
    readonly baseUrl: string,
    @InjectConfig(TOKEN)
    private readonly token: string,
  ) {
    fetchService.BASE_URL = baseUrl;
  }

  public async fetch<T>(fetch: FilteredFetchArguments): Promise<T> {
    return await this.fetchService.fetch({
      ...fetch,
      headers: {
        ["X-Gotify-Key"]: this.token,
      },
    });
  }
}
