import {
  ALL_DOMAINS,
  GetDomain,
  PICK_ENTITY,
} from "@digital-alchemy/home-assistant";
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
export type ROOM_SCENES<ROOM extends ALL_ROOM_NAMES> = Extract<
  keyof Get<PICK_ROOM<ROOM>, "scenes">,
  string
>;
export const SCENE_ROOM_OPTIONS = "scene-room";
export type iSceneRoom<NAME extends ALL_ROOM_NAMES = ALL_ROOM_NAMES> =
  // No other allowed option
  // eslint-disable-next-line @typescript-eslint/ban-types
  Function & {
    [SCENE_ROOM_OPTIONS]: iSceneRoomOptions<NAME>;
  };

export type SceneSwitchState = { state: "on" | "off" };
export type SceneLightStateOn = {
  /**
   * Light will probably restore previous value
   */
  brightness: number;
  /**
   * If not provided, light will attempt to use color temp if possible
   */
  rgb_color?: {
    b: number;
    g: number;
    r: number;
  };
  state: "on";
};
export type SceneLightState = { state: "off" } | SceneLightStateOn;

type MappedDomains = {
  light: SceneLightState;
  switch: SceneSwitchState;
};

export type SceneDefinition = {
  [entity_id: PICK_ENTITY<keyof MappedDomains>]: MappedDomains[GetDomain<
    typeof entity_id
  >];
};

export type SceneList<SCENES extends string> = Record<
  SCENES,
  Partial<Record<PICK_ENTITY<AllowedSceneDomains>, SceneDefinition>>
>;
