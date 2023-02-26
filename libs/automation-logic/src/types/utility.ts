import { ALL_DOMAINS, PICK_ENTITY } from "@steggy/home-assistant";
import { Get } from "type-fest";

import { iSceneRoomOptions } from "../decorators";
import { MODULE_CONFIGURATION } from "../dynamic";

export type AllowedSceneDomains = Extract<
  ALL_DOMAINS,
  "switch" | "light" | "fan"
>;

export type ALL_GLOBAL_SCENES = keyof typeof MODULE_CONFIGURATION.global_scenes;
export type ALL_ROOM_NAMES =
  keyof typeof MODULE_CONFIGURATION.room_configuration;

export type GetRoomConfiguration<ROOM extends ALL_ROOM_NAMES> =
  (typeof MODULE_CONFIGURATION.room_configuration)[ROOM];

export type PICK_ROOM<ROOM extends ALL_ROOM_NAMES> = GetRoomConfiguration<ROOM>;
export type ROOM_SCENES<ROOM extends ALL_ROOM_NAMES> = Exclude<
  Extract<keyof Get<PICK_ROOM<ROOM>, "local_scenes">, string>,
  ALL_GLOBAL_SCENES
>;
export const SCENE_ROOM_OPTIONS = "scene-room";
export type iSceneRoom<NAME extends ALL_ROOM_NAMES = ALL_ROOM_NAMES> =
  // No other allowed option
  // eslint-disable-next-line @typescript-eslint/ban-types
  Function & {
    [SCENE_ROOM_OPTIONS]: iSceneRoomOptions<NAME>;
  };

type SceneDefinition = unknown;

export type SceneList<SCENES extends string> = Record<
  SCENES,
  Partial<Record<PICK_ENTITY<AllowedSceneDomains>, SceneDefinition>>
>;
