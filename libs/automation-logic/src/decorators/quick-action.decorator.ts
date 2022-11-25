import { OnEvent } from "@steggy/boilerplate";
import { v4 } from "uuid";

import { iSceneRoom } from "./scene-room.decorator";

interface QuickActionOptions {
  description?: string;
  /**
   * default = function name
   */
  title?: string;
}
export type iQuickAction = {
  id: string;
  method: string;
  options: QuickActionOptions;
};

export const QUICK_ACTIONS = new Map<iSceneRoom, iQuickAction[]>();
export const QUICK_ACTION = (id: string) => `quick-action/${id}`;
/**
 * Only works on methods inside scene rooms
 */
export function QuickAction(options?: QuickActionOptions): MethodDecorator {
  return function (target: iSceneRoom, method: string, descriptor) {
    const current = QUICK_ACTIONS.get(target) ?? [];
    const id = v4();
    current.push({ id, method, options: { ...options } });
    QUICK_ACTIONS.set(target, current);
    OnEvent(QUICK_ACTION(id))(target, method, descriptor);
  };
}
