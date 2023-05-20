import {
  ALL_DOMAINS,
  GetDomain,
  PICK_ENTITY,
} from "@digital-alchemy/home-assistant";

import { RoomConfiguration } from "./configuration";

export interface AutomationLogicModuleConfiguration {
  global_scenes?: Record<string, boolean>;
  room_configuration?: Record<string, RoomConfiguration>;
}

export type AllowedSceneDomains = Extract<
  ALL_DOMAINS,
  "switch" | "light" | "fan"
>;

export const SCENE_ROOM_OPTIONS = "scene-room";

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
