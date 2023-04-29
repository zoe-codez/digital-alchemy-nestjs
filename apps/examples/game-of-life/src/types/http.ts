import { RGB } from "@digital-alchemy/rgb-matrix";
import { Color } from "rpi-led-matrix";

export type GameConfiguration = {
  color: RGB;
  grid: boolean[][];
  height?: number;
  speed?: number;
  width?: number;
};

export const COLOR_OFF: Color = { b: 0, g: 0, r: 0 };
export const COLOR_ON = ({ r, g, b }: Color = COLOR_OFF) =>
  r + g + b === 0 ? 0 : 1;
export type GridArray = Color[][];

export class SetMatrixBody {
  speed: number;
  ticks: number;
}

export const DEFAULT_AUTH_PASSWORD = "super-secret-password";
