import { RGB } from "@digital-alchemy/rgb-matrix";
import { Color } from "rpi-led-matrix";

export type GameConfiguration = {
  color: RGB;
  grid: GridArray;
  height: number;
  speed: number;
  width: number;
};

export const off: Color = { b: 0, g: 0, r: 0 };
export const on = ({ r, g, b }: Color = off) => (r + g + b === 0 ? 0 : 1);
export type GridArray = Color[][];

export class SetMatrixBody {
  speed: number;
  ticks: number;
}

export const DEFAULT_AUTH_PASSWORD = "super-secret-password";
