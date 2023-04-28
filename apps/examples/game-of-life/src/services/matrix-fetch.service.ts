import { FetchService, InjectConfig } from "@digital-alchemy/boilerplate";
import { ADMIN_KEY_HEADER } from "@digital-alchemy/server";
import { FetchWith } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

import { DEFAULT_AUTH_PASSWORD } from "../types";

type PartialFetch = Omit<FetchWith, "baseUrl" | "headers">;

@Injectable()
export class MatrixFetch {
  constructor(
    private readonly fetchService: FetchService,
    @InjectConfig("MATRIX_BASE_URL", {
      default: "http://192.168.1.100:7000",
      description: "Base URL to target GameOfLifeClient",
      type: "string",
    })
    private readonly baseUrl: string,
    @InjectConfig("MATRIX_AUTH", {
      default: DEFAULT_AUTH_PASSWORD,
      description: "Matrix auth password",
      type: "string",
    })
    private readonly auth: string,
  ) {}

  public async fetch<T>(fetchWith: PartialFetch) {
    return await this.fetchService.fetch<T>({
      ...fetchWith,
      baseUrl: this.baseUrl,
      headers: { [ADMIN_KEY_HEADER]: this.auth },
    });
  }
}
