import { MethodDecoratorFactory } from "@steggy/utilities";

import { ALL_ROOM_NAMES, ROOM_SCENES } from "../types";

export type OnSceneChangeOptions<ROOM extends ALL_ROOM_NAMES = ALL_ROOM_NAMES> =
  ROOM | { room: ROOM; target_scene: ROOM_SCENES<ROOM> };

export const OnSceneChange =
  MethodDecoratorFactory<OnSceneChangeOptions>("ON_SCENE_CHANGE");
