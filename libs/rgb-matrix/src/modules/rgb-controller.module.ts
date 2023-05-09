import { LibraryModule } from "@digital-alchemy/boilerplate";
import { RenderUtilitiesModule } from "@digital-alchemy/render-utils";

import { BorderSpinService, PulseLaserService } from "../animations";
import {
  DEFAULT_FONT,
  LIB_RGB_MATRIX,
  MATRIX_OPTIONS,
  PI_MATRIX_BASE_URL,
  PI_MATRIX_KEY,
} from "../config";
import {
  AnimationService,
  LineService,
  MatrixFetch,
  TextLayoutService,
} from "../providers";
import { FONTS } from "../types";

const providers = [
  AnimationService,
  BorderSpinService,
  LineService,
  MatrixFetch,
  PulseLaserService,
  TextLayoutService,
];

@LibraryModule({
  configuration: {
    [DEFAULT_FONT]: {
      default: "5x8" as FONTS,
      description:
        "What font should text rendering use if the widget does not provide one?",
      type: "string",
    },
    [MATRIX_OPTIONS]: {
      default: {},
      description: "See MatrixOptions in rpi-led-matrix",
      type: "internal",
    },
    [PI_MATRIX_BASE_URL]: {
      default: "http://localhost:7000",
      type: "string",
    },
    [PI_MATRIX_KEY]: {
      type: "string",
    },
  },
  exports: providers,
  imports: [RenderUtilitiesModule],
  library: LIB_RGB_MATRIX,
  providers,
})
export class RGBMatrixModule {}
