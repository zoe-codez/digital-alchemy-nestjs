import {
  AutoLogService,
  Cron,
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
import { CronExpression, each, is } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

import { AGGRESSIVE_SCENES } from "../config";
import { SceneDefinition, SceneSwitchState } from "../types";
import { LightMangerService } from "./light-manager.service";
import { SceneRoomService } from "./scene-room.service";

@Injectable()
export class AggressiveScenesService {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig(AGGRESSIVE_SCENES)
    private readonly aggressive: boolean,
    private readonly entity: EntityManagerService,
    @InjectCallProxy()
    private readonly call: iCallService,
    private readonly lights: LightMangerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  protected async checkRooms() {
    try {
      await each([...SceneRoomService.loaded.keys()], async room => {
        this.logger.trace({ name: room }, `check room`);
        await this.validateRoomScene(room);
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
    if (entity.state === expected.state) {
      // * As expected
      return;
    }
    this.logger.debug(
      { name: entity_id },
      `changing state to {%s}`,
      expected.state,
    );
    await this.call.switch[`turn_${expected.state}`]({ entity_id });
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
    const definition = configuration[room.current] as SceneDefinition;
    if (!is.object(definition) || is.empty(definition)) {
      // ? There currently is no use case for a scene with no entities in it
      // Not technically an error though
      return;
    }

    await each(Object.keys(definition), async (entity_id: PICK_ENTITY) => {
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
          await this.lights.manageLight(entity, definition);
          return;
        case "switch":
          await this.manageSwitch(entity, definition);
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
