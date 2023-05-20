import {
  ACTIVE_APPLICATION,
  AutoLogService,
  InjectConfig,
} from "@digital-alchemy/boilerplate";
import {
  GET_ATTRIBUTE_TEMPLATE,
  Icon,
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
  AUTOMATION_LOGIC_MODULE_CONFIGURATION,
  AutomationLogicModuleConfiguration,
} from "../types";
import { MQTTHealth } from "./mqtt-health.service";
import { SceneRoomService } from "./scene-room.service";

const icon: Icon = undefined;

const currentScenes = new Map<
  string,
  PUSH_PROXY<PICK_GENERATED_ENTITY<"sensor">>
>();
const setProxy = new Map<string, SceneRoomService>();

@Injectable()
export class SceneControllerService {
  constructor(
    private readonly config: PushEntityConfigService,
    private readonly health: MQTTHealth,
    private readonly logger: AutoLogService,
    private readonly mqtt: MqttService,
    private readonly pushEntity: PushEntityService,
    private readonly pushProxy: PushProxyService,
    @Inject(AUTOMATION_LOGIC_MODULE_CONFIGURATION)
    private readonly configuration: AutomationLogicModuleConfiguration,
    @InjectConfig(MQTT_TOPIC_PREFIX)
    private readonly prefix: string,
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
  ) {}

  public currentScene(room: string) {
    return currentScenes.get(room);
  }

  public onSceneChange(room: string, scene: string, name: string): void {
    const target = currentScenes.get(room);
    target.state = name;
    target.attributes.scene = scene;
  }

  public register(name: string, setter: SceneRoomService): void {
    this.logger.debug({ name }, `Register`);
    setProxy.set(name, setter);
  }

  protected async onModuleInit(): Promise<void> {
    this.addPlugin();
    await this.findRooms();
  }

  private addPlugin(): void {
    const name = "scene_controller";
    this.config.LOCAL_PLUGINS.set(name, {
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
    await each(rooms, async (name: string) => {
      const room = room_configuration[name];
      this.logger.info({ name: room?.name ?? name }, `Init room`);
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
              setProxy.get(name).set(id);
            },
          );
        });
      }
    });
  }
}
