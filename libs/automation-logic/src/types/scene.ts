import { PICK_ENTITY } from "@steggy/home-assistant";

export type tSceneType = Partial<{
  brightness: number;
  kelvin: number;
  rgb_color: [r: number, g: number, b: number];
  state: string;
}>;

export type tScene = Partial<Record<PICK_ENTITY, tSceneType>>;
export type SceneDescription<RoomNames extends string = string> = {
  global: string[];
  rooms: Partial<Record<RoomNames, string[]>>;
};
