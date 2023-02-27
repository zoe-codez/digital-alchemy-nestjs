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
import { each, is, TitleCase } from "@steggy/utilities";

import {
  ALL_GLOBAL_SCENES,
  ALL_ROOM_NAMES,
  AUTOMATION_LOGIC_MODULE_CONFIGURATION,
  AutomationLogicModuleConfiguration,
} from "../types";
import { SceneRoomService } from "./scene-room.service";

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
  private readonly setProxy = new Map<ALL_ROOM_NAMES, SceneRoomService>();

  public globalSet(
    scene: ALL_GLOBAL_SCENES,
    options?: { include: ALL_ROOM_NAMES[] } | { exclude: ALL_ROOM_NAMES[] },
  ): void {
    const exclude =
      is.object(options) && "exclude" in options ? options.exclude : [];
    const rooms =
      is.object(options) && "include" in options
        ? options.include
        : [...this.setProxy.keys()].filter(i => !exclude.includes(i));
    rooms.forEach(room => this.setProxy.get(room).set(scene));
  }

  public register(room: ALL_ROOM_NAMES, setter: SceneRoomService): void {
    this.setProxy.set(room, setter);
  }

  protected async onModuleInit(): Promise<void> {
    await this.buildCurrentSceneSensors();
  }

  private async buildCurrentSceneSensors(): Promise<void> {
    const { room_configuration } = this.configuration;
    const rooms = Object.keys(room_configuration ?? {});
    await each(rooms, async (room: ALL_ROOM_NAMES) => {
      this.logger.info(`[%s] building sensors`, room);
      const id =
        `sensor.room_${room}_current_scene` as PICK_GENERATED_ENTITY<"sensor">;
      this.pushEntity.insert(id, {
        icon,
        name: `${
          room_configuration[room].name || TitleCase(room)
        } current scene`,
      });
      this.currentScenes.set(room, await this.pushProxy.createPushProxy(id));
    });
  }
}
