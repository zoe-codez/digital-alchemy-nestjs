/* eslint-disable sonarjs/cognitive-complexity */
import {
  AnnotationPassThrough,
  AutoLogService,
  InjectConfig,
  InjectLogger,
} from "@digital-alchemy/boilerplate";
import {
  domain,
  ENTITY_STATE,
  EntityManagerService,
  GenericEntityDTO,
  iCallService,
  InjectCallProxy,
  OnEntityUpdate,
  PICK_ENTITY,
} from "@digital-alchemy/home-assistant";
import {
  each,
  eachSeries,
  EMPTY,
  INVERT_VALUE,
  is,
  PERCENT,
  VALUE,
} from "@digital-alchemy/utilities";
import { Inject, Injectable, Provider, Scope } from "@nestjs/common";
import { INQUIRER } from "@nestjs/core";
import EventEmitter from "eventemitter3";
import { nextTick } from "process";
import { LiteralUnion } from "type-fest";
import { v4 } from "uuid";

import { CIRCADIAN_SENSOR, DEFAULT_DIM } from "../config";
import { iSceneRoomOptions, ROOM_CONFIG_MAP } from "../decorators";
import {
  AUTOMATION_LOGIC_MODULE_CONFIGURATION,
  AutomationLogicModuleConfiguration,
  MAX_LED_BRIGHTNESS,
  OFF,
  SCENE_ROOM_OPTIONS,
  SCENE_SET_ENTITY,
  SceneList,
  tScene,
} from "../includes";
import { CircadianService } from "./circadian.service";
import { SceneControllerService } from "./scene-controller.service";

const ROOMS = new Map<string, SceneRoomService>();
interface HasKelvin {
  kelvin: number;
}

type tTransitions<SCOPED extends string> = Partial<
  Record<
    LiteralUnion<SCOPED, "*">,
    Partial<Record<LiteralUnion<SCOPED, "*">, AnnotationPassThrough>>
  >
>;

type ALL_GLOBAL_SCENES = string;
type ALL_ROOM_NAMES = string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ROOM_SCENES<NAME> = string;
type NAME = string;

/**
 * Importing this provider is required to actually register a room.
 * The annotation itself is not enough
 */
@Injectable({ scope: Scope.TRANSIENT })
export class SceneRoomService {
  public static loaded = new Map<ALL_ROOM_NAMES, SceneRoomService>();
  /**
   * pre-create rooms to ensure they are created at least once
   */
  public static buildProviders(
    configuration: AutomationLogicModuleConfiguration,
  ): Provider[] {
    return Object.keys(configuration.room_configuration).map(
      (i: ALL_ROOM_NAMES) => {
        return {
          inject: [SceneRoomService],
          provide: v4(),
          useFactory(room: SceneRoomService) {
            room.load(i);
            SceneRoomService.loaded.set(i, room);
            return room;
          },
        } as Provider;
      },
    );
  }

  constructor(
    private readonly circadian: CircadianService,
    private readonly controller: SceneControllerService,
    private readonly entityManager: EntityManagerService,
    private readonly eventEmitter: EventEmitter,
    @Inject(INQUIRER) private inquirer: unknown,
    @InjectLogger()
    private readonly logger: AutoLogService,
    @InjectCallProxy()
    private readonly call: iCallService,
    @InjectConfig(CIRCADIAN_SENSOR)
    private readonly circadianSensor: PICK_ENTITY<"sensor">,
    @InjectConfig(DEFAULT_DIM)
    private readonly defaultDim: number,
    @Inject(AUTOMATION_LOGIC_MODULE_CONFIGURATION)
    private readonly moduleConfiguration: AutomationLogicModuleConfiguration,
    @Inject(ROOM_CONFIG_MAP)
    private readonly roomConfigurations: ROOM_CONFIG_MAP,
  ) {}

  public get current() {
    const entity = this.entityManager.byId(
      `sensor.${this.name}_current_scene`,
    ) as GenericEntityDTO<{ scene: string }>;
    return (entity?.attributes?.scene || "unknown") as ROOM_SCENES<NAME>;
  }

  public get sceneDefinition() {
    const current = this.current;
    return {
      configuration: this.configuration.scenes[current],
      options: this.options.scenes[current],
    };
  }

  public name: NAME;
  private readonly entities: Set<PICK_ENTITY> = new Set();
  private readonly scenes: Map<ROOM_SCENES<NAME>, tScene> = new Map();
  private readonly transitions: tTransitions<ROOM_SCENES<NAME>> = {};

  /**
   * From specific provider annotation configuration
   */
  private get configuration() {
    return this.roomConfigurations.get(this.name);
  }

  /**
   * From module configuration
   */
  private get options() {
    return this.moduleConfiguration.room_configuration[this.name];
  }

  public dimmableLights(
    circadian = false,
    includeOff = false,
  ): PICK_ENTITY<"light">[] {
    if (is.empty(this.name)) {
      return [];
    }
    const lights: PICK_ENTITY<"light">[] = [];
    const scene = this.scenes.get(this.current) ?? {};
    Object.keys(scene).forEach((id: PICK_ENTITY<"light">) => {
      const current = this.entityManager.byId(id);
      if (current.state !== "on" && !includeOff) {
        return;
      }
      if (
        (circadian && this.shouldCircadian(id)) ||
        (!circadian && (scene[id] as { state: string }).state === "on")
      ) {
        lights.push(id);
      }
    });
    return lights;
  }

  public async global(
    scene: ALL_GLOBAL_SCENES,
    { excludeSelf = false }: { excludeSelf?: boolean } = {},
  ): Promise<void> {
    this.logger.info(`Setting global scene {%s}`, scene);
    await each([...ROOMS.entries()], async ([name, sceneService]) => {
      if (excludeSelf && name === this.name) {
        return;
      }
      await sceneService.set(scene);
    });
  }

  /**
   * type guard
   */
  public isValidScene(scene: string): scene is ROOM_SCENES<NAME> {
    return !is.undefined(this.configuration.scenes[scene]);
    // Canned transitions (not sure how this wouldn't also be caught in the scene list tho)
    // Object.entries(this.options.transitions ?? {}).some(
    //   ([from, targets]) => from === scene || !is.undefined(targets[scene]),
    // )
  }

  /**
   * Brightness (as controlled by the dimmer) must remain in the 5-100% range
   *
   * To go under 5, turn off the light instead
   */
  public async lightDim(amount: number = this.defaultDim): Promise<void> {
    if (is.empty(this.name)) {
      this.logger.error(`Cannot light dim`);
      return;
    }
    if (amount === INVERT_VALUE) {
      amount = this.defaultDim * INVERT_VALUE;
    }
    const lights = this.dimmableLights();
    await each(lights, async entity_id => {
      const entity = this.entityManager.byId(entity_id);
      let { brightness = OFF } = entity.attributes as { brightness?: number };
      brightness += amount;
      if (brightness > MAX_LED_BRIGHTNESS) {
        brightness = MAX_LED_BRIGHTNESS;
      }
      if (brightness < EMPTY) {
        brightness = EMPTY;
      }
      this.logger.debug(
        { amount },
        `[%s] set brightness: {%s/%s (%s%)}`,
        entity_id,
        brightness,
        MAX_LED_BRIGHTNESS,
        Math.floor((brightness * PERCENT) / MAX_LED_BRIGHTNESS),
      );
      await this.call.light.turn_on({
        brightness,
        entity_id,
      });
    });
  }

  public load(name: NAME): void {
    this.name = name;
    const ref = this as unknown;
    this.controller.register(name, ref as SceneRoomService);
  }

  /**
   * Change the current scene
   * Will automatically process
   */
  public set(sceneName: ROOM_SCENES<NAME>): void {
    if (is.empty(this.name)) {
      this.logger.error(`Cannot set scene {%s}`, sceneName);
      return;
    }
    nextTick(async () => {
      // sceneName = await this.runTransitions(this.current, sceneName);
      // transitions disabled
      if (!this.scenes.has(sceneName)) {
        this.logger.info(`Scene set interrupted: transition cleared target`);
        return;
      }
      this.logger.debug(`[%s] Setting scene {%s}`, this.name, sceneName);

      const { scene, lights } = this.dynamicProperties(sceneName);

      // Send most things through the expected scene apply
      // Send requests to set lights to a specific temperature through the `light.turn_on` call
      await Promise.all([
        // Normal scene set
        new Promise<void>(async done => {
          if (!is.empty(scene)) {
            Object.keys(scene).forEach(id =>
              this.eventEmitter.emit(SCENE_SET_ENTITY, id),
            );
            await this.call.scene.apply({
              entities: scene,
            });
          }
          done();
        }),
        // Set lights to current color temp
        new Promise<void>(async done => {
          await eachSeries(
            Object.keys(lights),
            async (id: PICK_ENTITY<"light">) => {
              const change = lights[id];
              this.eventEmitter.emit(SCENE_SET_ENTITY, id);
              await this.call.light.turn_on({
                brightness: change.brightness,
                entity_id: id,
                kelvin: change.kelvin,
              });
            },
          );
          done();
        }),
      ]);
      this.controller.onSceneChange(
        this.name,
        sceneName,
        this.options.scenes[sceneName].friendly_name,
      );
    });
  }

  /**
   * Should circadian if:
   *  - auto circadian is not disabled
   *  - is a light, that is currently on
   *  - the light was recently turned off (<5s)
   *  -
   */
  public shouldCircadian(
    entity_id: PICK_ENTITY<"light">,
    target?: string,
  ): boolean {
    if (domain(entity_id) !== "light") {
      return false;
    }
    if (!is.empty(target) && target !== "on") {
      return false;
    }
    const currentScene = this.scenes.get(this.current) ?? {};
    if (!currentScene[entity_id]) {
      return true;
    }
    return Object.keys(currentScene[entity_id]).every(i =>
      ["state", "brightness"].includes(i),
    );
  }

  /**
   * Update the light temperature for relevant light entities
   */
  protected async circadianLightingUpdate(color_temp: number): Promise<void> {
    const lights: PICK_ENTITY<"light">[] = [];
    if (!this.scenes) {
      // Too early!
      // eslint-disable-next-line no-console
      return;
    }
    const scene = this.scenes.get(this.current) ?? {};

    // Run through all the lights defined in current scene
    Object.keys(scene).forEach((id: PICK_ENTITY<"light">) => {
      const entity = this.entityManager.byId(id);
      if (!entity) {
        this.logger.error(`[${id}] not found`);
        return;
      }
      if (this.shouldCircadian(id, entity.state)) {
        lights.push(id);
      }
    });
    if (is.empty(lights)) {
      return;
    }
    if (!this.call.light) {
      this.logger.error(
        `[light] domain is unavailable. Ensure proxy API is running`,
      );
      return;
    }
    await this.call.light.turn_on({
      entity_id: lights,
      kelvin: color_temp,
    });
  }

  protected onApplicationBootstrap() {
    if (is.empty(this.name)) {
      // Technically valid, but not ideal
      // Would like to prevent non-scene rooms from importing this class in the future
      // Causes some weird side effects, and the analogies really don't work all that well
      //
      this.logger.warn(`Scene set imported by non-room`);
      return;
    }

    // Register room provider
    const service = this as unknown;
    ROOMS.set(this.name, service as SceneRoomService);

    const scenes = this.options?.scenes;

    this.logger.info(`Room [%s] loaded`, this.name);
    // Run through each individual scene, doing individual registration
    Object.keys(scenes).forEach((name: ROOM_SCENES<NAME>) => {
      const roomScenes = this.configuration.scenes as SceneList<
        ROOM_SCENES<NAME>
      >;
      if (is.empty(roomScenes)) {
        this.logger.error(
          `[@SceneRoom]({%s}) does not define scenes`,
          this.name,
        );
        return;
      }
      if (!roomScenes[name]) {
        this.logger.error(
          `[@SceneRoom]({%s}) does not define scene {%s}`,
          this.name,
          name,
        );
        return;
      }
      const scene = roomScenes[name];
      this.scenes.set(name as ROOM_SCENES<NAME>, scene as tScene);
      this.logger.debug(` - scene {%s}`, name);
      // Add entities used in the scene to the local list of entities used in this room
      Object.entries(scene).forEach(([entityName]) =>
        this.entities.add(entityName as PICK_ENTITY),
      );
    });
    OnEntityUpdate(
      this.circadianSensor,
      (entity: ENTITY_STATE<typeof this.circadianSensor>) => {
        this.circadianLightingUpdate(Number(entity.state));
      },
    );
  }

  protected onModuleInit(): void {
    if (!this.inquirer) {
      return;
    }
    const options = this.inquirer.constructor[
      SCENE_ROOM_OPTIONS
    ] as iSceneRoomOptions;
    if (!is.object(options)) {
      return;
    }
    this.load(options.name);
  }

  /**
   * ## Scene rewiring
   *
   * Light entities that are being set directly to a given kelvin value run through a different workflow.
   * These are separated out from the entities that are being otherwise set in the scene, and have the current kelvin injected into their attributes
   *
   */
  private dynamicProperties(scene: ROOM_SCENES<NAME>) {
    const item = this.scenes.get(scene) ?? {};
    const list = Object.keys(item)
      .map((name: PICK_ENTITY<"light">) => {
        const value = item[name];
        if (domain(name) === "switch") {
          return [name, value];
        }
        if (domain(name) !== "light") {
          return undefined;
        }
        if (!this.shouldCircadian(name, value?.state)) {
          return [name, value];
        }
        this.logger.debug(`circadian {%s}`, name);
        return [
          name,
          { kelvin: this.circadian.circadianEntity.state, ...value },
        ];
      })
      .filter(i => !is.undefined(i));
    return {
      lights: Object.fromEntries(
        list.filter(i => !is.undefined((i[VALUE] as HasKelvin).kelvin)),
      ),
      scene: Object.fromEntries(
        list.filter(i => is.undefined((i[VALUE] as HasKelvin).kelvin)),
      ),
    };
  }
}
