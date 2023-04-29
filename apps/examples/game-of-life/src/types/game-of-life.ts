import { GameConfiguration } from "./http";

export type GameOfLifeComponentOptions = GameConfiguration & {
  sendExternal: boolean;
};

export type GameOfLifeSettings = {
  speed: number;
};
