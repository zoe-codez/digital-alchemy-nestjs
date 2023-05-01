import {
  AutoConfigService,
  AutoLogService,
} from "@digital-alchemy/boilerplate";
import { LIB_RGB_MATRIX, MATRIX_OPTIONS } from "@digital-alchemy/rgb-matrix";
import { isNumberString } from "class-validator";
import { LedMatrix, MatrixOptions } from "rpi-led-matrix";

import { LIB_PI_MATRIX_CLIENT, RUNTIME_OPTIONS } from "../config";

export type PiMatrixClientOptions = {
  controllers?: boolean;
};
export const MATRIX_INSTANCE = "MATRIX_INSTANCE";

export const MatrixInstanceProvider = {
  inject: [AutoConfigService, AutoLogService],
  provide: MATRIX_INSTANCE,
  useFactory(config: AutoConfigService, logger: AutoLogService) {
    const matrixOptions = config.get<MatrixOptions>([
      LIB_RGB_MATRIX,
      MATRIX_OPTIONS,
    ]);
    const runtimeOptions = config.get<MatrixOptions>([
      LIB_PI_MATRIX_CLIENT,
      RUNTIME_OPTIONS,
    ]);
    const matrix = Object.fromEntries(
      Object.entries(matrixOptions).map(([name, value]) => [
        name,
        isNumberString(value) ? Number(value) : value,
      ]),
    );
    const runtime = Object.fromEntries(
      Object.entries(runtimeOptions).map(([name, value]) => [
        name,
        isNumberString(value) ? Number(value) : value,
      ]),
    );
    logger.info({ matrix: matrix, runtime: runtime }, `new [LedMatrix]`);
    return new LedMatrix(
      { ...LedMatrix.defaultMatrixOptions(), ...matrix },
      { ...LedMatrix.defaultRuntimeOptions(), ...runtime },
    );
  },
};
