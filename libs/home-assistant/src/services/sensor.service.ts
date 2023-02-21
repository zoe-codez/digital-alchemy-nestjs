import { Inject, Injectable } from "@nestjs/common";
import { AutoLogService, FetchService } from "@steggy/boilerplate";

import {
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
} from "../types";

@Injectable()
export class SensorService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly fetch: FetchService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
  ) {}

  public createProxy(id: PICK_GENERATED_ENTITY<"sensors">) {
    return new Proxy({}, {});
  }

  private emitUpdate(): void {
    //
  }
}
