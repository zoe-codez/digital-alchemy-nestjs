import {
  ACTIVE_APPLICATION,
  AutoLogService,
  InjectConfig,
  ModuleScannerService,
  ScannerBinding,
} from "@digital-alchemy/boilerplate";
import {
  GET_ATTRIBUTE_TEMPLATE,
  iCallService,
  Icon,
  InjectCallProxy,
  NewEntityId,
  PICK_GENERATED_ENTITY,
  PUSH_PROXY,
  PushEntityConfigService,
  PushEntityService,
  PushProxyService,
} from "@digital-alchemy/home-assistant";
import { MqttService } from "@digital-alchemy/mqtt";
import { each, is, TitleCase } from "@digital-alchemy/utilities";
import { Inject, Injectable } from "@nestjs/common";
import { mkdirSync, writeFileSync } from "fs";
import { dump } from "js-yaml";
import { join } from "path";

import { MQTT_TOPIC_PREFIX } from "../config";
import {
  OnSceneChange,
  OnSceneChangeOptions,
  ROOM_CONFIG_MAP,
} from "../decorators";
import {
  ALL_GLOBAL_SCENES,
  ALL_ROOM_NAMES,
  AUTOMATION_LOGIC_MODULE_CONFIGURATION,
  AutomationLogicModuleConfiguration,
  ROOM_SCENES,
} from "../types";
import { MQTTHealth } from "./mqtt-health.service";
import { SceneRoomService } from "./scene-room.service";

const icon: Icon = undefined;

const currentScenes = new Map<
  ALL_ROOM_NAMES,
  PUSH_PROXY<PICK_GENERATED_ENTITY<"sensor">>
>();
const bindings: ScannerBinding<OnSceneChangeOptions>[] = [];
const setProxy = new Map<ALL_ROOM_NAMES, SceneRoomService<ALL_ROOM_NAMES>>();

@Injectable()
export class SceneControllerService {
  constructor(
    private readonly config: PushEntityConfigService,
    private readonly health: MQTTHealth,
    private readonly logger: AutoLogService,
    private readonly mqtt: MqttService,
    private readonly pushEntity: PushEntityService,
    private readonly pushProxy: PushProxyService,
    private readonly scanner: ModuleScannerService,
    @InjectCallProxy()
    private readonly call: iCallService,
    @Inject(AUTOMATION_LOGIC_MODULE_CONFIGURATION)
    private readonly configuration: AutomationLogicModuleConfiguration,
    @InjectConfig(MQTT_TOPIC_PREFIX)
    private readonly prefix: string,
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    @Inject(ROOM_CONFIG_MAP)
    private readonly roomConfiguration: ROOM_CONFIG_MAP,
  ) {}

  public currentScene(room: ALL_ROOM_NAMES) {
    return currentScenes.get(room);
  }

  /**
   * Set a common scene across multiple rooms.
   * Limited to global scenes
   */
  public globalSet(
    scene: ALL_GLOBAL_SCENES,
    options?: { include: ALL_ROOM_NAMES[] } | { exclude: ALL_ROOM_NAMES[] },
  ): void {
    const exclude =
      is.object(options) && "exclude" in options ? options.exclude : [];
    const rooms =
      is.object(options) && "include" in options
        ? options.include
        : [...setProxy.keys()].filter(i => !exclude.includes(i));
    rooms.forEach(room => setProxy.get(room).set(scene));
  }

  public onSceneChange<ROOM extends ALL_ROOM_NAMES = ALL_ROOM_NAMES>(
    room: ROOM,
    scene: ROOM_SCENES<ROOM>,
    name: string,
  ): void {
    const target = currentScenes.get(room);
    target.state = name;
    target.attributes.scene = scene;
  }

  public register(
    room: ALL_ROOM_NAMES,
    setter: SceneRoomService<ALL_ROOM_NAMES>,
  ): void {
    this.logger.warn(`[%s] register`, room);
    setProxy.set(room, setter);
  }

  protected async onModuleInit(): Promise<void> {
    this.addPlugin();
    this.scanForOnSceneChange();
    await this.findRooms();
  }

  private addPlugin(): void {
    const name = "scene_controller";
    this.config.LOCAL_PLUGINS.set(name, {
      storage: () => [
        name,
        {
          target: join(__dirname, "..", "dynamic.d.ts"),
          typesData: this.generateTypes(),
        },
      ],
      yaml: (base: string) => {
        const { room_configuration } = this.configuration;
        if (is.empty(room_configuration)) {
          this.logger.error(`No rooms to build scenes for`);
          return;
        }
        base = join(base, "mqtt", "scene");
        mkdirSync(base, { recursive: true });
        Object.keys(room_configuration).forEach(name => {
          const room = room_configuration[name];
          if (is.empty(room?.scenes)) {
            this.logger.error(`[%s] bad room configuration`, name);
            return;
          }
          Object.keys(room.scenes).forEach(sceneName => {
            const scene = room.scenes[sceneName];
            const id = `${name}_${sceneName}`;
            const entity_id = `scene.${id}`;

            writeFileSync(
              join(base, `${id}.yaml`),
              dump({
                availability: this.health.availability,
                command_topic: `${this.prefix}/${this.application}/room-scene/${name}/${sceneName}`,
                name: `${room.name ?? TitleCase(name)} ${
                  scene?.friendly_name ?? TitleCase(sceneName)
                }`,
                payload_on: "ON",
                unique_id: is.hash(entity_id),
              }),
              "utf8",
            );
          });
        });
        return {
          root_include: [
            "mqtt:",
            "  scene: !include_dir_list ./mqtt/scene",
          ].join(`\n`),
        };
      },
    });
  }

  private async findRooms(): Promise<void> {
    const { room_configuration } = this.configuration;
    const rooms = Object.keys(room_configuration ?? {});
    await each(rooms, async (name: ALL_ROOM_NAMES) => {
      const room = room_configuration[name];
      this.logger.info(`[%s] init room`, room?.name ?? name);
      // * current scene sensor
      const id = `sensor.${name}_current_scene` as NewEntityId<"sensor">;
      this.pushEntity.insert(id, {
        attributes: {
          scene: GET_ATTRIBUTE_TEMPLATE("scene"),
        },
        icon,
        name: `${room?.name || TitleCase(name)} current scene`,
      });
      currentScenes.set(name, await this.pushProxy.createPushProxy(id));

      // * mqtt set scene binding
      if (!is.empty(room?.scenes)) {
        Object.keys(room.scenes).forEach(id => {
          const scene = room.scenes[id];
          if (!is.object(scene)) {
            return;
          }
          const fullName = `${room.name ?? TitleCase(name)} ${
            scene?.friendly_name ?? TitleCase(id)
          }`;
          this.mqtt.subscribe(
            `${this.prefix}/${this.application}/room-scene/${name}/${id}`,
            () => {
              this.logger.debug({ id, name }, "[%s] scene set", fullName);
              setProxy.get(name).set(id as ROOM_SCENES<typeof name>);
            },
          );
        });
      }
    });
  }

  private generateTypes(): string {
    return [
      `export const MODULE_CONFIGURATION = ${JSON.stringify(
        this.configuration,
        undefined,
        "  ",
      )};`,
      `export const ROOM_MAPPINGS = ${JSON.stringify(
        Object.fromEntries(this.roomConfiguration.entries()),
        undefined,
        "  ",
      )};`,
    ].join(`\n`);
  }

  private scanForOnSceneChange(): void {
    this.logger.info(`[@OnSceneChange] binding`);
    this.scanner.bindMethodDecorator<OnSceneChangeOptions>(
      OnSceneChange,
      binding => bindings.push(binding),
    );
  }
}
