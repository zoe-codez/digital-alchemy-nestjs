import { Controller, Injectable } from "@nestjs/common";
import { PICK_ENTITY } from "@steggy/home-assistant";

import { SceneTransitionMapping } from "../contracts";

export type iSceneRoom<SCENES extends string = string> = {};

export type SceneList<SCENES extends string> = Record<
  SCENES,
  Partial<Record<PICK_ENTITY, unknown>>
>;
export interface iSceneRoomOptions<
  SCENES extends string,
  NAMES extends string = string,
> {
  /**
   * Turning on lights without specifying an `rgb_color` will put the light into an automatically color temperature mode.
   *
   * default: true
   */
  auto_circadian?: boolean;
  /**
   * If application has http enabled, providing this value will register the provider as a controller.
   *
   * @example `/office`
   */
  controller?: string;
  /**
   * Requires `AvailabilityMonitor` to use functionality.
   *
   * Provide as empty Set to enable.
   * By default, the set will auto populate with entities utilized in scenes.
   * Additional values can be added to the set, which will automatically merge values
   */
  ensure_availability?: Set<PICK_ENTITY>;
  /**
   * Whenever these lights are on, they will be issued circadian updates
   */
  force_circadian?: Set<PICK_ENTITY<"light">>;
  /**
   * Tell the availability monitor to not notify for certain entities
   */
  ignore_availability?: Set<PICK_ENTITY>;
  /**
   * Simple name to call room, preferably 1 word
   */
  name: NAMES;
  /**
   * Scene declarations
   */
  scenes?: Partial<SceneList<SCENES>>;
  /**
   * Describe
   */
  transitions?: SceneTransitionMapping<SCENES>;
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
