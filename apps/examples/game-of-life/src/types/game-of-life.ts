import { RGB } from "@digital-alchemy/rgb-matrix";

import { GameConfiguration } from "./http";

export type GameOfLifeComponentOptions = GameConfiguration & {
  sendExternal: boolean;
};

export type GameOfLifeSettings = RGB & {
  speed: number;
};
