import { PICK_ENTITY } from "@steggy/home-assistant";
import { CronExpression } from "@steggy/utilities";

export interface EnforceEntityStateOptions {
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
  on_entity_update?: PICK_ENTITY | PICK_ENTITY[];
  /**
   * Watching global EventEmitter for events
   */
  on_event?: string | string[];
}

export interface EnforceEntityStateConfig {
  options: EnforceEntityStateOptions;
  property: string;
}

export const ENFORCE_ENTITY_STATE = Symbol.for("ENFORCE_ENTITY_STATE");

/**
 * Poll a property getter (boolean) for what the current state of a switch SHOULD be.
 *
 * - `true` = turn on
 * - `false` = turn off
 *
 * If the current state doesn't match that, then sent the appropriate `turn_on` / `turn_off` call.
 */
export function EnforceEntityState(
  options: EnforceEntityStateOptions,
): PropertyDecorator {
  return function (target, property: string) {
    const data = (target.constructor[ENFORCE_ENTITY_STATE] ??
      []) as EnforceEntityStateConfig[];
    data.push({
      options: {
        interval: CronExpression.EVERY_10_MINUTES,
        ...options,
      } as EnforceEntityStateOptions,
      property,
    });
    target.constructor[ENFORCE_ENTITY_STATE] = data;
  };
}
