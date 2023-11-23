import {
  AutoLogService,
  Cron,
  CronExpression,
  InjectConfig,
} from "@digital-alchemy/boilerplate";
import {
  domain,
  ENTITY_STATE,
  EntityManagerService,
  iCallService,
  InjectCallProxy,
  PICK_ENTITY,
} from "@digital-alchemy/home-assistant";
import { each, is } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import EventEmitter from "eventemitter3";

import { AGGRESSIVE_SCENES } from "../config";
import {
  AGGRESSIVE_SCENES_ADJUSTMENT,
  AggressiveScenesAdjustmentData,
  SceneDefinition,
  SceneSwitchState,
} from "../includes";
import { LightMangerService } from "./light-manager.service";
import { SceneRoomService } from "./scene-room.service";

/**
 * Sometimes when setting a scene, entities don't always set state as desired.
 * Entities inside groups occasionally will not always fully perform the command
 *   ex: light pauses part way through turn_off, resulting in a dimmed but not off state
 *   ex: transient communication failure causing state set to not be received
 *
 * This service exists to track down entities that are not matching the scene definition, then make the appropriate correction
 */
@Injectable()
export class AggressiveScenesService {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig(AGGRESSIVE_SCENES)
    private readonly aggressive: boolean,
    private readonly entity: EntityManagerService,
    @InjectCallProxy()
    private readonly call: iCallService,
    @Inject(forwardRef(() => LightMangerService))
    private readonly light: LightMangerService,
    private readonly event: EventEmitter,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  protected async checkRooms() {
    try {
      await each([...SceneRoomService.loaded.keys()], async name => {
        await this.validateRoomScene(name);
      });
    } catch (error) {
      this.logger.error({ error });
    }
  }

  private async manageSwitch(
    entity: ENTITY_STATE<PICK_ENTITY<"switch">>,
    scene: SceneDefinition,
  ) {
    const entity_id = entity.entity_id;
    const expected = scene[entity_id] as SceneSwitchState;
    if (is.empty(expected)) {
      // ??
      return;
    }
    if (entity.state === "unavailable") {
      this.logger.warn(
        { name: entity_id },
        `{unavailable} entity, cannot manage state`,
      );
      return;
    }
    let performedUpdate = false;
    if (entity.state !== expected.state) {
      await this.matchSwitchToScene(entity, expected);
      performedUpdate = true;
    }
    if (performedUpdate) {
      return;
    }
    if (!is.empty(entity.attributes.entity_id)) {
      // ? This is a group
      await each(entity.attributes.entity_id, async child_id => {
        const child = this.entity.byId(child_id);
        if (!child) {
          this.logger.warn(
            `[%s] => {%s} child entity of group cannot be found`,
            entity_id,
            child_id,
          );
          return;
        }
        if (child.state !== expected.state) {
          await this.matchSwitchToScene(child, expected);
        }
      });
    }
  }

  private async matchSwitchToScene(
    entity: ENTITY_STATE<PICK_ENTITY<"switch">>,
    expected: SceneSwitchState,
  ) {
    const entity_id = entity.entity_id;
    this.logger.debug(
      { name: entity_id },
      `changing state to {%s}`,
      expected.state,
    );
    this.event.emit(AGGRESSIVE_SCENES_ADJUSTMENT, {
      entity_id,
      type: "switch_on_off",
    } as AggressiveScenesAdjustmentData);
    if (expected.state === "on") {
      await this.call.switch.turn_on({ entity_id });
      return;
    }
    await this.call.switch.turn_off({ entity_id });
  }

  /**
   * This function should **NOT** emit logs on noop
   *
   * - errors
   * - warnings
   * - state changes
   */
  private async validateRoomScene(roomName: string): Promise<void> {
    const room = SceneRoomService.loaded.get(roomName);
    const { configuration, options } = room.sceneDefinition;
    if (this.aggressive === false || options?.aggressive?.enabled === false) {
      // nothing to do
      return;
    }
    if (!configuration) {
      this.logger.warn(
        { configuration, name: roomName, options },
        `cannot validate room scene`,
      );
      return;
    }
    if (!is.object(configuration) || is.empty(configuration)) {
      // ? There currently is no use case for a scene with no entities in it
      // Not technically an error though
      this.logger.warn("no definition");
      return;
    }

    await each(Object.keys(configuration), async (entity_id: PICK_ENTITY) => {
      const entity = this.entity.byId(entity_id);
      if (!entity) {
        // * Home assistant outright does not send an entity for this id
        // The wrong id was probably input
        //
        // ? This is distinct from "unavailable" entities
        this.logger.error({ name: entity_id }, `cannot find entity`);
        return;
      }
      const entityDomain = domain(entity_id);
      switch (entityDomain) {
        case "light":
          await this.light.manageLight(
            entity as ENTITY_STATE<PICK_ENTITY<"light">>,
            configuration as SceneDefinition,
          );
          return;
        case "switch":
          await this.manageSwitch(entity, configuration as SceneDefinition);
          return;
        default:
          this.logger.debug(
            { name: entityDomain },
            `so actions set for domain`,
          );
      }
    });
  }
}
