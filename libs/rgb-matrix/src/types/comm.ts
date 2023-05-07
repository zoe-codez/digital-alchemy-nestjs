import { RGB } from "./render-widget.dto";

export type MatrixDimensionsResponse = {
  height: number;
  width: number;
};
export const MATRIX_STATE_CACHE_KEY = "MATRIX_STATE";

export type MatrixState = MatrixDimensionsResponse &
  RGB & {
    batchSize: number;
    board: boolean[][];
    connected: boolean;
    cursorX: number;
    cursorY: number;
    frame: number;
    left: number;
    minHeight: number;
    minWidth: number;
    speed: number;
    top: number;
  };
