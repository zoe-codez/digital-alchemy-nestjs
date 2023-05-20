import { Controller, Injectable } from "@nestjs/common";
import { ClassConstructor } from "class-transformer";
import { Get } from "type-fest";

import { RoomConfiguration, SCENE_ROOM_OPTIONS, SceneList } from "../types";

export const ROOM_CONFIG_MAP = "ROOM_CONFIG_MAP";
type ALL_ROOM_NAMES = string;

export type ROOM_CONFIG_MAP = Map<ALL_ROOM_NAMES, iSceneRoomOptions>;
type Config = Record<string, RoomConfiguration>;

export interface iSceneRoomOptions<
  CONFIG extends Config = Config,
  ROOM_NAME extends RoomName<CONFIG> = RoomName<CONFIG>,
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
  scenes?: SceneList<RoomScenes<CONFIG, ROOM_NAME>>;
}
// /**
//  * Describe
//  */
// transitions?: SceneTransitionMapping<ROOM_NAME>;

type RoomName<CONFIG extends Record<string, { scenes?: object }>> = Extract<
  keyof CONFIG,
  string
>;
type RoomScenes<
  CONFIG extends Record<string, { scenes?: object }>,
  NAME extends RoomName<CONFIG>,
> = Extract<keyof Get<NAME, "scenes">, string>;

export function SceneRoom<
  CONFIG extends Config = Config,
  NAME extends RoomName<CONFIG> = RoomName<CONFIG>,
>(options: iSceneRoomOptions<CONFIG, NAME>): ClassDecorator {
  return function (target: ClassConstructor<unknown>) {
    SceneRoom.SCENE_ROOM_MAP.set(options.name, options);
    //
    target[SCENE_ROOM_OPTIONS] = options;

    // Pick the correct annotation based on the `controller` option
    if (options.controller) {
      return Controller(options.controller)(target);
    }
    return Injectable()(target);
  } as ClassDecorator;
}
/**
 * name => provider
 */
SceneRoom.SCENE_ROOM_MAP = new Map<ALL_ROOM_NAMES, iSceneRoomOptions>();
