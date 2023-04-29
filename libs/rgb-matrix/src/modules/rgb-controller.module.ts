import { LibraryModule } from "@digital-alchemy/boilerplate";

import {
  BorderPulseService,
  BorderSpinService,
  PulseLaserService,
} from "../animations";
import { MATRIX_OPTIONS, PI_MATRIX_BASE_URL, PI_MATRIX_KEY } from "../config";
import {
  DEFAULT_FONT,
  LIB_RGB_MATRIX,
  PANEL_COLUMNS,
  PANEL_HEIGHT,
  PANEL_TOTAL,
  PANEL_WIDTH,
} from "../config";
import {
  AnimationService,
  LineService,
  MatrixFetch,
  MatrixMathService,
  TextLayoutService,
} from "../providers";
import { FONTS } from "../types";

const providers = [
  AnimationService,
  BorderPulseService,
  BorderSpinService,
  LineService,
  MatrixFetch,
  MatrixMathService,
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
    [PANEL_COLUMNS]: {
      default: 2,
      description: "Quantity of panels side by side in each row",
      type: "number",
    },
    [PANEL_HEIGHT]: {
      default: 32,
      description: "Pixel count",
      type: "number",
    },
    [PANEL_TOTAL]: {
      default: 10,
      description: "Total panel quantity in array",
      type: "number",
    },
    [PANEL_WIDTH]: {
      default: 64,
      description: "Pixel count",
      type: "number",
    },
    [PI_MATRIX_BASE_URL]: {
      default: "http://orchid:7000",
      type: "string",
    },
    [PI_MATRIX_KEY]: {
      type: "string",
    },
  },
  exports: providers,
  library: LIB_RGB_MATRIX,
  providers,
})
export class RGBMatrixModule {}
