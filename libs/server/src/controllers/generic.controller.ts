import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  ACTIVE_APPLICATION,
  InjectConfig,
  WorkspaceService,
} from "@steggy/boilerplate";

import { HIDE_VERSION } from "../config";

@Controller()
@ApiTags("generic")
export class GenericController {
  constructor(
    @Inject(ACTIVE_APPLICATION)
    private readonly activeApplication: symbol,
    @InjectConfig(HIDE_VERSION) private readonly hideVersion: boolean,
    private readonly workspace: WorkspaceService,
  ) {}

  private BOOT_TIME = Date.now();

  @Get(`/health`)
  public health(): unknown {
    return `OK`;
  }
}
