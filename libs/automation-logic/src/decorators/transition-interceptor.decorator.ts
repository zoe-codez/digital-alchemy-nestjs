import { iSceneRoom } from "./scene-room.decorator";

interface MethodTransition<SCENES extends string = string> {
  /**
   * Run if scene matches.
   * "*" = default value & match all
   */
  from?: SCENES | "*";
  method: string;
  /**
   * Run if scene matches.
   * "*" = default value & match all
   */
  to?: SCENES | "*";
}

export const SCENE_ROOM_TRANSITIONS = new Map<iSceneRoom, MethodTransition[]>();

/**
 * Method transitions override definitions in the scene options
 *
 * Method should either return void, or replacement scene target name (act as a redirect).
 * Transitions ARE run recursively
 */
export function SceneTransitionInterceptor<SCENES extends string = string>({
  from = "*",
  to = "*",
}: Omit<MethodTransition<SCENES>, "method"> = {}): MethodDecorator {
  return function (target: iSceneRoom, method: string) {
    const current = SCENE_ROOM_TRANSITIONS.get(target) ?? [];
    current.push({ from, method, to });
    SCENE_ROOM_TRANSITIONS.set(target, current);
  };
}
