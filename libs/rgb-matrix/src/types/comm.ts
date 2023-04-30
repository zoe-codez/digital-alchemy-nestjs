export type MatrixDimensionsResponse = {
  height: number;
  width: number;
};
export const MATRIX_STATE_CACHE_KEY = "MATRIX_STATE";
export type MatrixState = MatrixDimensionsResponse & {
  connected: boolean;
};
