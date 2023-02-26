import { Inject, Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import {
  iCallService,
  Icon,
  InjectCallProxy,
  PICK_GENERATED_ENTITY,
  PUSH_PROXY,
  PushEntityService,
  PushProxyService,
} from "@steggy/home-assistant";
import { each } from "@steggy/utilities";

import {
  ALL_ROOM_NAMES,
  AUTOMATION_LOGIC_MODULE_CONFIGURATION,
  AutomationLogicModuleConfiguration,
} from "../types";

const icon: Icon = undefined;

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

  private readonly currentScenes = new Map<
    ALL_ROOM_NAMES,
    PUSH_PROXY<PICK_GENERATED_ENTITY<"sensor">>
  >();

  protected async onModuleInit(): Promise<void> {
    await this.buildCurrentSceneSensors();
  }

  private async buildCurrentSceneSensors(): Promise<void> {
    const rooms = Object.keys(this.configuration.room_configuration ?? {});
    await each(rooms, async (room: ALL_ROOM_NAMES) => {
      this.logger.info(`[%s] building sensors`, room);
      const id =
        `sensor.room_${room}_current_scene` as PICK_GENERATED_ENTITY<"sensor">;
      this.pushEntity.insert(id, { icon });
      this.currentScenes.set(room, await this.pushProxy.createPushProxy(id));
    });
  }
}
