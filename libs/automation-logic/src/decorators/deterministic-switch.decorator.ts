import { PICK_ENTITY } from "@steggy/home-assistant";
import {
  CompleteAnnotation,
  CronExpression,
  PropertyDecoratorFactory,
} from "@steggy/utilities";

export interface DeterministicSwitchOptions {
  /**
   * Receive updates from configured annotations
   */
  attachAnnotation?:
    | CompleteAnnotation<unknown>
    | CompleteAnnotation<unknown>[];
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

/**
 * Poll a property getter (boolean) for what the current state of a switch SHOULD be.
 *
 * - `true` = turn on
 * - `false` = turn off
 *
 * If the current state doesn't match that, then sent the appropriate `turn_on` / `turn_off` call.
 */
export const DeterministicSwitch =
  PropertyDecoratorFactory<DeterministicSwitchOptions>("ENFORCE_SWITCH_STATE");
