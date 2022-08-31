import { OnEvent } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";

import { HA_EVENT_STATE_CHANGE, PICK_ENTITY } from "../contracts";

/**
 * ```typescript
 * class {
 *   @OnEntityUpdate("sensor.example")
 *   private updateExample(
 *     new_state: ENTITY_STATE<"sensor.example">,
 *     old_state: ENTITY_STATE<"sensor.example">,
 *     event: HassEventDTO<"sensor.example">,
 *   ): void {}
 * }
 * ```
 */
export function OnEntityUpdate(...list: PICK_ENTITY[]): MethodDecorator {
  if (is.empty(list)) {
    return OnEvent(HA_EVENT_STATE_CHANGE);
  }
  return OnEvent(...list.map(entity => `${entity}/update`));
}
