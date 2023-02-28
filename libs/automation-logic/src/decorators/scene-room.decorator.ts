import { Controller, Injectable } from "@nestjs/common";

import {
  ALL_ROOM_NAMES,
  iSceneRoom,
  ROOM_SCENES,
  SCENE_ROOM_OPTIONS,
  SceneList,
} from "../types";

export const ROOM_CONFIG_MAP = "ROOM_CONFIG_MAP";
export type ROOM_CONFIG_MAP = Map<
  ALL_ROOM_NAMES,
  iSceneRoomOptions<ALL_ROOM_NAMES>
>;

export interface iSceneRoomOptions<
  ROOM_NAME extends ALL_ROOM_NAMES = ALL_ROOM_NAMES,
> {
  /**
   * Turning on lights without specifying an `rgb_color` will put the light into an automatically circadian mode.
   *
   * default: `true`
   */
  auto_circadian?: boolean;
  /**
   * If application has http enabled, providing this value will register the provider as a controller.
   *
   * @example `/office`
   */
  controller?: string;
  /**
   * Simple name to call room, preferably 1 word
   */
  name: ROOM_NAME;
  /**
   * Scene declarations
   */
  scenes?: SceneList<ROOM_SCENES<ROOM_NAME>>;
}
// /**
//  * Describe
//  */
// transitions?: SceneTransitionMapping<ROOM_NAME>;

export function SceneRoom<NAME extends ALL_ROOM_NAMES = ALL_ROOM_NAMES>(
  options: iSceneRoomOptions<NAME>,
): ClassDecorator {
  return function (target: iSceneRoom<NAME>) {
    SceneRoom.SCENE_ROOM_MAP.set(options.name, options);
    //
    target[SCENE_ROOM_OPTIONS] = options;

    // Pick the correct annotation based on the `controller` option
    if (options.controller) {
      return Controller(options.controller)(target);
    }
    return Injectable()(target);
  };
}
/**
 * name => provider
 */
SceneRoom.SCENE_ROOM_MAP = new Map<
  ALL_ROOM_NAMES,
  iSceneRoomOptions<ALL_ROOM_NAMES>
>();
