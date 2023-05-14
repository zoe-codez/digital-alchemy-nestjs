import { AuthStack, GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Controller, Delete, Get, Param, Post } from "@nestjs/common";

import { RebuildService } from "../services";
import {
  CacheMetadata,
  FullCacheObject,
  TypeGenerateInterface,
} from "../types";

@Controller("/type-generate")
@AuthStack()
export class TypeGenerateController
  implements TypeGenerateInterface<typeof GENERIC_SUCCESS_RESPONSE>
{
  constructor(private readonly rebuildService: RebuildService) {}

  @Get("/list")
  public async listCacheMetadata(): Promise<CacheMetadata[]> {
    return await this.rebuildService.listCacheMetadata();
  }

  @Get("/inspect/:id")
  public async inspectCache(@Param("id") id: string): Promise<FullCacheObject> {
    return await this.rebuildService.inspectCache(id);
  }

  @Delete("/cache/:id")
  public async deleteCache(
    @Param("id") id: string,
  ): Promise<typeof GENERIC_SUCCESS_RESPONSE> {
    await this.rebuildService.deleteCache(id);
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Post("/rebuild")
  public async rebuild(): Promise<typeof GENERIC_SUCCESS_RESPONSE> {
    await this.rebuildService.rebuild();
    return GENERIC_SUCCESS_RESPONSE;
  }
}
