import { LibraryModule } from "@digital-alchemy/boilerplate";

import {
  LIB_RENDER_UTILS,
  PANEL_COLUMNS,
  PANEL_HEIGHT,
  PANEL_TOTAL,
  PANEL_WIDTH,
} from "../config";
import { ColorService, MatrixMathService } from "../services";

const providers = [ColorService, MatrixMathService];

@LibraryModule({
  configuration: {
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
  },
  exports: providers,
  library: LIB_RENDER_UTILS,
  providers,
})
export class RenderUtilitiesModule {}
