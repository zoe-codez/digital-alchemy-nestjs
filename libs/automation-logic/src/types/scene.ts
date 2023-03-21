import { GetDomain, PICK_ENTITY } from "@digital-alchemy/home-assistant";

type SceneAwareDomains = "switch" | "light";
type RGB = [r: number, g: number, b: number];

export type LightOff = {
  state: "off";
};
export type LightOn = {
  brightness?: number;
  kelvin?: number;
  rgb_color?: RGB;
  state?: "on";
};

type EntitySceneType<DOMAIN extends SceneAwareDomains> = {
  light: LightOff | LightOn;
  switch: { state: "on" | "off" };
}[DOMAIN];

export type tSceneType<ENTITY extends PICK_ENTITY<SceneAwareDomains>> =
  EntitySceneType<GetDomain<ENTITY>>;

export type tScene = {
  [key: PICK_ENTITY<SceneAwareDomains>]: tSceneType<typeof key>;
};
export type SceneDescription<RoomNames extends string = string> = {
  global: string[];
  rooms: Partial<Record<RoomNames, string[]>>;
};
