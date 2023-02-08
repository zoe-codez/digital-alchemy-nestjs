import { PICK_ENTITY } from "@steggy/home-assistant";
import { CronExpression } from "@steggy/utilities";

export interface EnforceSwitchStateOptions {
  /**
   * Set the state of this switch
   */
  entity_id: PICK_ENTITY<"switch"> | PICK_ENTITY<"switch">[];
  /**
   * cron compatible expression
   *
   * Default: EVERY_10_MINUTES
   */
  interval?: CronExpression | `${CronExpression}` | string;

  /**
   * Check on update of this entity
   */
  onEntityUpdate?: PICK_ENTITY | PICK_ENTITY[];
  /**
   * Watching global EventEmitter for events
   */
  onEvent?: string | string[];
}

export interface EnforceSwitchStateConfig {
  options: EnforceSwitchStateOptions;
  property: string;
}

export const ENFORCE_SWITCH_STATE = Symbol.for("ENFORCE_SWITCH_STATE");

/**
 * Poll a property getter (boolean) for what the current state of a switch SHOULD be.
 *
 * - `true` = turn on
 * - `false` = turn off
 *
 * If the current state doesn't match that, then sent the appropriate `turn_on` / `turn_off` call.
 */
export function EnforceSwitchState(
  options: EnforceSwitchStateOptions,
): PropertyDecorator {
  return function (target, property: string) {
    const data = (target.constructor[ENFORCE_SWITCH_STATE] ??
      []) as EnforceSwitchStateConfig[];
    data.push({
      options: {
        interval: CronExpression.EVERY_10_MINUTES,
        ...options,
      } as EnforceSwitchStateOptions,
      property,
    });
    target.constructor[ENFORCE_SWITCH_STATE] = data;
  };
}
