import { AuthStack, GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Controller, Delete, Get, Post } from "@nestjs/common";

import { TypeGenerateInterface } from "../types";

@Controller("/type-generate")
@AuthStack()
export class TypeGenerateController
  implements TypeGenerateInterface<typeof GENERIC_SUCCESS_RESPONSE>
{
  @Get("/list")
  public listCacheMetadata() {
    return undefined;
  }

  @Get("/inspect/:id")
  public inspectCache() {
    return undefined;
  }

  @Delete("/cache/:id")
  public deleteCache() {
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Post("/rebuild")
  public rebuild(): typeof GENERIC_SUCCESS_RESPONSE {
    return GENERIC_SUCCESS_RESPONSE;
  }
}
