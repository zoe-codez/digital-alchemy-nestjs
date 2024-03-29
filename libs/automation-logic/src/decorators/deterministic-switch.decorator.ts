import { PICK_ENTITY } from "@digital-alchemy/home-assistant";
import {
  AttachMethodDecorator,
  CronExpression,
  PropertyDecoratorFactory,
} from "@digital-alchemy/utilities";

export interface DeterministicSwitchOptions {
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
   * Receive updates from configured annotations
   */
  onEvent?: AttachMethodDecorator | AttachMethodDecorator[];
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
