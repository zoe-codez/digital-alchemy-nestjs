/* eslint-disable radar/cognitive-complexity */
import { Injectable, Scope } from "@nestjs/common";
import {
  AnnotationPassThrough,
  AutoLogService,
  CacheService,
  InjectConfig,
  InjectLogger,
  ModuleScannerService,
} from "@steggy/boilerplate";
import {
  domain,
  EntityManagerService,
  iCallService,
  InjectCallProxy,
  PICK_ENTITY,
} from "@steggy/home-assistant";
import {
  each,
  eachSeries,
  EMPTY,
  INVERT_VALUE,
  is,
  PERCENT,
  VALUE,
} from "@steggy/utilities";
import EventEmitter from "eventemitter3";
import { get } from "object-path";
import { nextTick } from "process";
import { LiteralUnion } from "type-fest";

import { DEFAULT_DIM } from "../config";
import { iSceneRoomOptions, SceneRoom } from "../decorators";
import {
  ALL_GLOBAL_SCENES,
  ALL_ROOM_NAMES,
  CannedTransitions,
  CIRCADIAN_UPDATE,
  iSceneRoom,
  LightTransition,
  MAX_BRIGHTNESS,
  OFF,
  REGISTER_ROOM,
  ROOM_SCENES,
  SCENE_CHANGE,
  SCENE_SET_ENTITY,
  tScene,
} from "../types";
import { CircadianService } from "./circadian.service";
import { TransitionRunnerService } from "./transition-runner.service";

const SCENE_CACHE = (room: ALL_ROOM_NAMES) => `ROOM_SCENE:${room}`;
const ROOMS = new Map<string, SceneRoomService>();
const current = new Map<ALL_ROOM_NAMES, string>();
interface HasKelvin {
  kelvin: number;
}

type tTransitions<SCOPED extends string> = Partial<
  Record<
    LiteralUnion<SCOPED, "*">,
    Partial<Record<LiteralUnion<SCOPED, "*">, AnnotationPassThrough>>
  >
>;

export function SET_ROOM_SCENE_EVENT<
  ROOM extends ALL_ROOM_NAMES = ALL_ROOM_NAMES,
  SCENE extends ROOM_SCENES<ROOM> = ROOM_SCENES<ROOM>,
>(room: ROOM, scene: SCENE): `room-set-scene/${ROOM}/${SCENE}` {
  return `room-set-scene/${room}/${scene}`;
}
// export const SET_ROOM_SCENE_EVENT = (room: ALL_ROOM_NAMES, scene: string) =>
//   `room-set-scene/${room}/${scene}`;
const ANY = "*";
// const CURRENT_SCENE_SENSORS

/**
 * Importing this provider is required to actually register a room.
 * The annotation itself is not enough
 */
@Injectable({ scope: Scope.TRANSIENT })
export class SceneRoomService<NAME extends ALL_ROOM_NAMES = ALL_ROOM_NAMES> {
  public static RoomState<NAME extends ALL_ROOM_NAMES>(room: NAME): string {
    return current.get(room);
  }

  constructor(
    @InjectLogger()
    private readonly logger: AutoLogService,
    private readonly entityManager: EntityManagerService,
    private readonly eventEmitter: EventEmitter,
    private readonly cache: CacheService,
    @InjectCallProxy()
    private readonly call: iCallService,
    private readonly circadian: CircadianService,
    @InjectConfig(DEFAULT_DIM)
    private readonly defaultDim: number,
    private readonly transition: TransitionRunnerService,
    private readonly scanner: ModuleScannerService,
  ) {}

  public get current() {
    return (current.get(this.roomName) ?? "off") as ROOM_SCENES<NAME>;
  }

  public roomName: NAME;
  private entities: Set<PICK_ENTITY> = new Set();
  private scenes: Map<ROOM_SCENES<NAME>, tScene> = new Map();
  private readonly transitions: tTransitions<ROOM_SCENES<NAME>> = {};

  private get parent() {
    return SceneRoom.SCENE_ROOM_SETTINGS.get(this.options) as iSceneRoom<NAME>;
  }

  private get options() {
    return SceneRoom.SCENE_ROOM_MAP.get(
      this.roomName,
    ) as iSceneRoomOptions<NAME>;
  }

  public dimmableLights(
    circadian = false,
    includeOff = false,
  ): PICK_ENTITY<"light">[] {
    if (is.empty(this.roomName)) {
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
    this.logger.info(`Setting global scene {${scene}}`);
    await each([...ROOMS.entries()], async ([name, sceneService]) => {
      if (excludeSelf && name === this.roomName) {
        return;
      }
      await sceneService.set(scene as ROOM_SCENES<NAME>);
    });
  }

  /**
   * type guard
   */
  public isValidScene(scene: string): scene is ROOM_SCENES<NAME> {
    return (
      !is.undefined(this.options.scenes[scene]) ||
      // Canned transitions (not sure how this wouldn't also be caught in the scene list tho)
      Object.entries(this.options.transitions ?? {}).some(
        ([from, targets]) => from === scene || !is.undefined(targets[scene]),
      )
    );
  }

  /**
   * Brightness (as controlled by the dimmer) must remain in the 5-100% range
   *
   * To go under 5, turn off the light instead
   */
  public async lightDim(amount: number = this.defaultDim): Promise<void> {
    if (is.empty(this.roomName)) {
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
      if (brightness > MAX_BRIGHTNESS) {
        brightness = MAX_BRIGHTNESS;
      }
      if (brightness < EMPTY) {
        brightness = EMPTY;
      }
      this.logger.debug(
        { amount },
        `[${entity_id}] set brightness: {${brightness}/${MAX_BRIGHTNESS} (${Math.floor(
          (brightness * PERCENT) / MAX_BRIGHTNESS,
        )}%)}`,
      );
      await this.call.light.turn_on({
        brightness,
        entity_id,
      });
    });
  }

  public load(name: NAME, instance: unknown): void {
    this.roomName = name;
    this.options.scenes ??= {};
    SceneRoom.SCENE_ROOM_SETTINGS.set(this.options, instance);
    this.eventEmitter.emit(REGISTER_ROOM, [name, instance]);
  }

  /**
   * Change the current scene
   * Will automatically process
   */
  public set(sceneName: ROOM_SCENES<NAME>): void {
    if (is.empty(this.roomName)) {
      this.logger.error(`Cannot set scene {${sceneName}}`);
      return;
    }
    nextTick(async () => {
      sceneName = await this.runTransitions(this.current, sceneName);
      if (!this.scenes.has(sceneName)) {
        this.logger.info(`Scene set interrupted: transition cleared target`);
        return;
      }
      this.logger.debug(`[${this.roomName}] Setting scene {${sceneName}}`);

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
      current.set(this.roomName, sceneName);
      await this.cache.set(SCENE_CACHE(this.roomName), sceneName);
      this.eventEmitter.emit(SCENE_CHANGE(this.roomName), sceneName);
    });
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

  protected async onApplicationBootstrap(): Promise<void> {
    if (is.empty(this.roomName)) {
      // Technically valid, but not ideal
      // Would like to prevent non-scene rooms from importing this class in the future
      // Causes some weird side effects, and the analogies really don't work all that well
      //
      this.logger.warn(`Scene set imported by non-room`);
      return;
    }
    this.scenes = new Map();

    // Register room provider
    const service = this as unknown;
    ROOMS.set(this.roomName, service as SceneRoomService);

    // Identify the current scene
    // This may be wrong if cache data isn't available, but that should be a temporary state
    const value = await this.cache.get<string>(SCENE_CACHE(this.roomName));
    current.set(this.roomName, value);

    this.logger.info(`Room [${this.roomName}] loaded`);

    // Run through each individual scene, doing individual registration
    Object.entries(this.options.scenes).forEach(
      ([name, scene]: [ROOM_SCENES<NAME>, unknown]) => {
        this.scenes.set(name as ROOM_SCENES<NAME>, scene as tScene);
        this.logger.debug(` - scene {${name}}`);
        // Add entities used in the scene to the local list of entities used in this room
        Object.entries(scene).forEach(([entityName]) =>
          this.entities.add(entityName as PICK_ENTITY),
        );
        // Add an event emitter subscription for this specific scene
        // Note: `hass-mqtt` will bind MQTT to this event to allow scene setting via mqtt entities
        this.eventEmitter.on(SET_ROOM_SCENE_EVENT(this.roomName, name), () => {
          this.set(name);
        });
      },
    );
    // Annotation based bindings don't work as expected in transient providers
    this.eventEmitter.on(CIRCADIAN_UPDATE, temperature =>
      this.circadianLightingUpdate(temperature),
    );
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
    const list = Object.keys(item).map((name: PICK_ENTITY<"light">) => {
      if (domain(name)) {
        return undefined;
      }
      const value = item[name];
      if (!this.shouldCircadian(name, value?.state)) {
        return [name, value];
      }
      this.logger.debug(`circadian {${name}}`);
      return [
        name,
        { kelvin: this.circadian.CURRENT_LIGHT_TEMPERATURE, ...value },
      ];
    });
    return {
      lights: Object.fromEntries(
        list.filter(i => !is.undefined((i[VALUE] as HasKelvin).kelvin)),
      ),
      scene: Object.fromEntries(
        list.filter(i => is.undefined((i[VALUE] as HasKelvin).kelvin)),
      ),
    };
  }

  /**
   * Retrieve a scene - scene transition step (if exists)
   */
  private getTransition(
    from: ROOM_SCENES<NAME>,
    to: ROOM_SCENES<NAME>,
    explicit = false,
    useMethods = true,
  ) {
    if (useMethods) {
      const method = this.getTransitionMethod(from, to, true);
      if (method) {
        return method;
      }
    }
    const canned = this.getTransitionCanned(from, to, true);
    if (canned) {
      return canned;
    }
    if (explicit) {
      return undefined;
    }
    if (useMethods) {
      const method = this.getTransitionMethod(from, to, false);
      if (method) {
        return method;
      }
    }
    return this.getTransitionCanned(from, to, false);
  }

  private getTransitionCanned(
    from: ROOM_SCENES<NAME>,
    to: ROOM_SCENES<NAME>,
    explicit = false,
  ): CannedTransitions[] {
    const transitions = this.options.transitions;
    if (!transitions) {
      return undefined;
    }
    const item = get(transitions, [from, to].join("."));
    if (item) {
      return item;
    }
    if (!explicit) {
      return undefined;
    }
    return (
      get(transitions, [ANY, to].join(".")) ||
      get(transitions, [from, ANY].join(".")) ||
      get(transitions, [ANY, ANY].join("."))
    );
  }

  /**
   * exact match > to match > from match > complete wildcard
   */
  private getTransitionMethod(
    from: ROOM_SCENES<NAME>,
    to: ROOM_SCENES<NAME>,
    explicit = false,
  ): AnnotationPassThrough {
    if (explicit) {
      return get(this.transitions, [from, to].join("."), undefined);
    }
    const source = this.transitions[from] ?? this.transitions[ANY];
    return source[to] ?? source[ANY];
  }

  private async runTransitions(
    from: ROOM_SCENES<NAME>,
    to: ROOM_SCENES<NAME>,
  ): Promise<ROOM_SCENES<NAME>> {
    let transition = this.getTransition(from, to);
    if (is.undefined(transition)) {
      return to;
    }

    let interrupt = false;
    const stop = () => (interrupt = true);

    // string result = method name
    if (is.string(transition)) {
      // wat
      if (!is.function(this.parent[transition])) {
        this.logger.error(
          `[${this.roomName}] failed to run transition function {${transition}} (undefined)`,
        );
        return to;
      }

      // the method should return a scene name, or void
      const result: ROOM_SCENES<NAME> | undefined = await this.parent[
        transition
      ]({
        from,
        stop,
        to,
      });
      const out = interrupt ? undefined : to;

      // sanity check: did the function return an invalid scene?
      // "valid" is defined as being in the scene list.
      // It can be assumed that if typescript isn't erroring, and it's in this list, it's valid
      if (is.string(result) && !this.scenes.has(result)) {
        //  ...whatever
        const runAnyway = this.getTransition(from, result, true);
        if (!runAnyway) {
          this.logger.error(
            { from, method: transition, result, to },
            `Invalid transition result. Should be scene name, or undefined`,
          );
          return out;
        }
      }

      // if the returned value is the same as the original target, skip down to the internal transition runner
      if (result !== to) {
        // recurse if valid
        if (this.scenes.has(result)) {
          const runResult = await this.runTransitions(from, result);
          return this.scenes.has(runResult) || is.undefined(runResult)
            ? runResult
            : to;
        }
        return out;
      }

      // Identify if there are any canned transitions to run
      transition = this.getTransition(from, to, false, false);
      if (!Array.isArray(transition)) {
        // No canned stuff to run
        return out;
      }
    }

    // hand off logic
    // this cannot do redirects
    await this.transition.run(
      transition as LightTransition[],
      this.scenes.get(to) ?? {},
      stop,
    );
    return interrupt ? undefined : to;
  }

  /**
   * Should circadian if:
   *  - auto circadian is not disabled
   *  - is a light, that is currently on
   *  - the light was recently turned off (<5s)
   *  -
   */
  private shouldCircadian(
    entity_id: PICK_ENTITY<"light">,
    target?: string,
  ): boolean {
    const { auto_circadian } = this.options;
    if (domain(entity_id) !== "light") {
      return false;
    }
    if ((!is.empty(target) && target !== "on") || auto_circadian === false) {
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
}
