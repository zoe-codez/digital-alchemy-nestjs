import { Inject, Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import {
  iCallService,
  InjectCallProxy,
  PushEntityService,
  PushProxyService,
} from "@steggy/home-assistant";

import {
  AUTOMATION_LOGIC_MODULE_CONFIGURATION,
  AutomationLogicModuleConfiguration,
} from "../types";

@Injectable()
export class SceneControllerService {
  constructor(
    @InjectCallProxy()
    private readonly call: iCallService,
    @Inject(AUTOMATION_LOGIC_MODULE_CONFIGURATION)
    private readonly configuration: AutomationLogicModuleConfiguration,
    private readonly logger: AutoLogService,
    private readonly pushProxy: PushProxyService,
    private readonly pushEntity: PushEntityService,
  ) {}

  protected onModuleInit(): void {
    //
  }

  private buildCurrentSceneSensors(): void {
    const rooms = Object.keys(this.configuration.room_configuration ?? {});
    rooms.forEach(room => {
      this.pushEntity.insert(`sensor.room_${room}_current_scene`, {
        // ""
      });
    });
  }
}
