import { Controller, Injectable } from "@nestjs/common";
import { PICK_ENTITY } from "@steggy/home-assistant";

import { ALL_ROOM_NAMES, ROOM_SCENES, SceneTransitionMapping } from "../types";

export type iSceneRoom<SCENES extends string = string> = {};

export type SceneList<SCENES extends string> = Record<
  SCENES,
  Partial<Record<PICK_ENTITY, unknown>>
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
  /**
   * Describe
   */
  transitions?: SceneTransitionMapping<ROOM_SCENES<ROOM_NAME>>;
}

export const SCENE_ROOM_MAP = new Map<string, iSceneRoomOptions<string>>();
export const SCENE_ROOM_SETTINGS = new Map<
  iSceneRoomOptions<string>,
  iSceneRoom<string>
>();
export const SCENE_ROOM_SETTINGS_REVERSE = new Map<
  iSceneRoom<string>,
  iSceneRoomOptions<string>
>();
export const SCENE_ROOM_OPTIONS = Symbol.for("scene-room");

export function SceneRoom<SCENES extends string, NAMES extends string = string>(
  options: iSceneRoomOptions<SCENES, NAMES>,
): ClassDecorator {
  return function (target) {
    SCENE_ROOM_SETTINGS.set(options, target as iSceneRoom<string>);
    SCENE_ROOM_SETTINGS_REVERSE.set(target as iSceneRoom<string>, options);
    SCENE_ROOM_MAP.set(options.name, options);
    target[SCENE_ROOM_OPTIONS] = options;
    if (options.controller) {
      return Controller(options.controller)(target);
    }
    return Injectable()(target);
  };
}
