import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@digital-alchemy/boilerplate";
import {
  ENTITY_STATE,
  EntityManagerService,
  iCallService,
  InjectCallProxy,
  PICK_ENTITY,
} from "@digital-alchemy/home-assistant";
import { is } from "@digital-alchemy/utilities";

import { SceneDefinition, SceneLightState, SceneLightStateOn } from "../types";
import { CircadianService, ColorLight } from "./circadian.service";

@Injectable()
export class LightMangerService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly entity: EntityManagerService,
    @InjectCallProxy()
    private readonly call: iCallService,
    private readonly circadian: CircadianService,
  ) {}

  /**
   * Lights fall into one of the following:
   *
   * ### Unable to change color, only brightness
   *
   * Lights will be maintained at the correct brightness / state
   *
   * ### Able to change color temp (only)
   *
   * Lights will be maintained at the correct brightness & circadian color temp
   *
   * ### RGB (only)
   *
   * Will always manage brightness & state.
   * If rgb color is passed, that will be used.
   * Otherwise, a conversion between color temp and rgb color is done within Home Assistant to attempt to track circadian color temp
   *
   * ### Anything goes
   *
   * Same as RGB only, but will preferentially use color temp mode
   */
  public async manageLight(
    entity: ENTITY_STATE<PICK_ENTITY<"light">>,
    scene: SceneDefinition,
  ) {
    const entity_id = entity.entity_id as PICK_ENTITY<"light">;
    const expected = scene[entity_id] as SceneLightState;
    if (is.empty(expected)) {
      // ??
      return;
    }
    if (entity.state === "unavailable") {
      this.logger.warn(`[%s] is {unavailable}, cannot manage state`);
      return;
    }
    if (expected.state === "off") {
      if (entity.state === "on") {
        this.logger.debug(`[%s] {on} => {off}`, entity_id);
        await this.call.light.turn_off({ entity_id });
      }
      return;
    }
    if ("rgb_color" in expected) {
      await this.manageLightColor(entity as ColorLight, expected);
      return;
    }
    await this.manageLightCircadian(entity as ColorLight, expected);
  }

  private async manageLightCircadian(
    entity: ColorLight,
    state: SceneLightStateOn,
  ): Promise<void> {
    const doesColorTemp =
      entity.attributes.supported_color_modes.includes("color_temp");
    // const targetKelvin = Math.max(entity.attributes.min)
    const stateTests = {
      brightness: entity.attributes.brightness == state.brightness,
      color:
        // * Does not support color temp = whatever goes right now (still check brightness & state)
        !doesColorTemp ||
        //
        this.circadian.lightInRange(entity),
      state: entity.state === "off",
    };
    // ? Find things that don't currently match expectations
    const reasons = Object.keys(stateTests).filter(key => !stateTests[key]);
    if (is.empty(reasons)) {
      return;
    }
    this.logger.debug({ reasons }, `[%s] setting light {temperature}`);
    await this.call.light.turn_on({
      brightness: state.brightness,
      entity_id: entity.entity_id,
      rgb_color: state.rgb_color,
    });
  }

  /**
   * Take in the expected color state of a light, and compare against actual
   *
   * If they don't match, then issue a `turn_on` call, and log a message
   */
  private async manageLightColor(
    entity: ColorLight,
    state: SceneLightStateOn,
  ): Promise<void> {
    const stateTests = {
      brightness: entity.attributes.brightness == state.brightness,
      color: entity.attributes.rgb_color.every(
        (color, index) => state.rgb_color[index] === color,
      ),
      state: entity.state === "off",
    };
    // ? Find things that don't currently match expectations
    const reasons = Object.keys(stateTests).filter(key => !stateTests[key]);
    if (is.empty(reasons)) {
      return;
    }
    this.logger.debug(
      { reasons, rgb_color: state.rgb_color },
      `[%s] setting light {color}`,
    );
    await this.call.light.turn_on({
      brightness: state.brightness,
      entity_id: entity.entity_id,
      rgb_color: state.rgb_color,
    });
  }
}
