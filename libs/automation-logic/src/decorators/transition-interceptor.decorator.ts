import { MethodDecoratorFactory } from "@steggy/utilities";

import { ALL_ROOM_NAMES, MethodTransition } from "../types";

export const SceneTransitionInterceptor = MethodDecoratorFactory(
  "SCENE_ROOM_TRANSITIONS",
);

/**
 * Method transitions override definitions in the scene options
 *
 * Method should either return void, or replacement scene target name (act as a redirect).
 * Transitions ARE run recursively
 */
export type SceneTransitionInterceptor<
  ROOM_NAME extends ALL_ROOM_NAMES = ALL_ROOM_NAMES,
> = ReturnType<typeof MethodDecoratorFactory<MethodTransition<ROOM_NAME>>>;
