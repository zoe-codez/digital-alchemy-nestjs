import { RGB } from "@digital-alchemy/rgb-matrix";

import { GameConfiguration } from "./http";

export type GameOfLifeComponentOptions = GameConfiguration & {
  sendExternal: boolean;
};

export type GameOfLifeSettings = RGB & {
  left: number;
  minHeight: number;
  minWidth: number;
  speed: number;
  top: number;
};
