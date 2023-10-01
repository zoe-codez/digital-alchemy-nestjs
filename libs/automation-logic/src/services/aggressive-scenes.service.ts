/* eslint-disable sonarjs/no-redundant-jump */
/* eslint-disable @typescript-eslint/member-ordering */
import {
  AGGRESSIVE_SCENES,
  LightMangerService,
  SceneDefinition,
  SceneRoomService,
  SceneSwitchState,
} from "@digital-alchemy/automation-logic";
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
import { Injectable } from "@nestjs/common";

@Injectable()
export class AggressiveScenesService {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig(AGGRESSIVE_SCENES)
    private readonly aggressive: boolean,
    private readonly entity: EntityManagerService,
    @InjectCallProxy()
    private readonly call: iCallService,
    private readonly light: LightMangerService,
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
    if (entity.state === expected.state) {
      // * As expected
      return;
    }
    this.logger.debug(
      { name: entity_id },
      `changing state to {%s}`,
      expected.state,
    );
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
