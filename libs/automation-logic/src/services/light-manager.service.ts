import { AutoLogService, InjectConfig } from "@digital-alchemy/boilerplate";
import {
  ENTITY_STATE,
  EntityManagerService,
  iCallService,
  InjectCallProxy,
  PICK_ENTITY,
} from "@digital-alchemy/home-assistant";
import { each, is, NONE } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import EventEmitter from "eventemitter3";

import { CIRCADIAN_MAX_TEMP, CIRCADIAN_MIN_TEMP } from "../config";
import {
  AGGRESSIVE_SCENES_ADJUSTMENT,
  AggressiveScenesAdjustmentData,
  AggressiveScenesAdjustmentTypes,
  SceneDefinition,
  SceneLightState,
  SceneLightStateOn,
} from "../includes";
import { CircadianService, ColorLight } from "./circadian.service";

const MAX_DIFFERENCE = 100;
@Injectable()
export class LightMangerService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly entity: EntityManagerService,
    @InjectCallProxy()
    private readonly call: iCallService,
    private readonly circadian: CircadianService,
    @InjectConfig(CIRCADIAN_MAX_TEMP)
    private readonly maxTemperature: number,
    @InjectConfig(CIRCADIAN_MIN_TEMP)
    private readonly minTemperature: number,
    private readonly event: EventEmitter,
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
    const performedUpdate = await this.matchToScene(entity, expected);
    if (performedUpdate) {
      return;
    }
    if (!is.empty(entity.attributes.entity_id)) {
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
        await this.matchToScene(child, expected);
      });
    }
  }

  private lightInRange({ attributes }: ColorLight) {
    if (!attributes.supported_color_modes.includes("color_temp")) {
      return true;
    }
    const min = Math.max(
      this.minTemperature,
      attributes.min_color_temp_kelvin ?? NONE,
    );
    const max = Math.min(
      this.maxTemperature,
      attributes.max_color_temp_kelvin ?? NONE,
    );
    const kelvin = attributes.color_temp_kelvin;
    const target = Math.min(max, Math.max(this.circadian.kelvin, min));
    const difference = Math.abs(kelvin - target);

    return difference <= MAX_DIFFERENCE;
  }

  private async manageLightCircadian(
    entity: ColorLight,
    state: SceneLightStateOn,
  ): Promise<boolean> {
    const stateTests = {
      brightness: entity.attributes.brightness === state.brightness,
      state: entity.state === state.state,
      temperature: this.lightInRange(entity),
    };
    // ? Find things that don't currently match expectations
    const reasons = Object.keys(stateTests).filter(key => !stateTests[key]);

    let type: AggressiveScenesAdjustmentTypes;
    if (!stateTests.state) {
      type = "light_on_off";
    } else if (!stateTests.brightness) {
      type = "light_brightness";
      // eslint-disable-next-line unicorn/no-negated-condition
    } else if (!stateTests.temperature) {
      type = "light_temperature";
    } else {
      return false;
    }
    this.logger.debug(
      {
        from: entity.attributes.color_temp_kelvin,
        name: entity.entity_id,
        reasons,
        state,
        to: this.circadian.kelvin,
      },
      `setting light {temperature}`,
    );
    this.event.emit(AGGRESSIVE_SCENES_ADJUSTMENT, {
      entity_id: entity.entity_id,
      type,
    } as AggressiveScenesAdjustmentData);
    await this.call.light.turn_on({
      brightness: state.brightness,
      entity_id: entity.entity_id,
      kelvin: this.circadian.kelvin,
    });
    return true;
  }

  /**
   * Take in the expected color state of a light, and compare against actual
   *
   * If they don't match, then issue a `turn_on` call, and log a message
   */
  private async manageLightColor(
    entity: ColorLight,
    state: SceneLightStateOn,
  ): Promise<boolean> {
    const stateTests = {
      brightness: entity.attributes.brightness == state.brightness,
      color: entity.attributes.rgb_color.every(
        (color, index) => state.rgb_color[index] === color,
      ),
      state: entity.state === "off",
    };
    // ? Find things that don't currently match expectations
    const reasons = Object.keys(stateTests).filter(key => !stateTests[key]);
    let type: AggressiveScenesAdjustmentTypes;
    if (stateTests.state) {
      type = "light_on_off";
    } else if (stateTests.brightness) {
      type = "light_brightness";
      // eslint-disable-next-line unicorn/no-negated-condition
    } else if (!stateTests.color) {
      type = "light_color";
    } else {
      return false;
    }
    this.event.emit(AGGRESSIVE_SCENES_ADJUSTMENT, {
      entity_id: entity.entity_id,
      type,
    } as AggressiveScenesAdjustmentData);
    this.logger.debug(
      { reasons, rgb_color: state.rgb_color },
      `[%s] setting light {color}`,
      entity.entity_id,
    );
    await this.call.light.turn_on({
      brightness: state.brightness,
      entity_id: entity.entity_id,
      rgb_color: state.rgb_color,
    });
    return true;
  }

  /**
   * ? return true if a change was made
   *
   * ? return false if everything is as expected
   */
  private async matchToScene(
    entity: ENTITY_STATE<PICK_ENTITY<"light">>,
    expected: SceneLightState,
  ): Promise<boolean> {
    const entity_id = entity.entity_id as PICK_ENTITY<"light">;
    if (expected.state === "off") {
      if (entity.state === "on") {
        this.logger.debug(`[%s] {on} => {off}`, entity_id);
        this.event.emit(AGGRESSIVE_SCENES_ADJUSTMENT, {
          entity_id,
          type: "light_on_off",
        } as AggressiveScenesAdjustmentData);
        await this.call.light.turn_off({ entity_id });
        return true;
      }
      return false;
    }
    if ("rgb_color" in expected) {
      return await this.manageLightColor(
        entity as unknown as ColorLight,
        expected,
      );
    }
    return await this.manageLightCircadian(
      entity as unknown as ColorLight,
      expected,
    );
  }
}
