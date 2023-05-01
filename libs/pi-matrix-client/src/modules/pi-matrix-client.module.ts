import { LibraryModule } from "@digital-alchemy/boilerplate";
import { RGBMatrixModule } from "@digital-alchemy/rgb-matrix";
import { DynamicModule, Provider } from "@nestjs/common";
import { join } from "path";
import { cwd } from "process";

import {
  ANIMATION_CACHE_DIRECTORY,
  BORDER_SPIN_LAYER_BOTTLENECK,
  DEFAULT_ANIMATION_INTERVAL,
  FONTS_DIRECTORY,
  LIB_PI_MATRIX_CLIENT,
  RUNTIME_OPTIONS,
  UPDATE_INTERVAL,
} from "../config";
import {
  AnimationController,
  MatrixController,
  WidgetController,
} from "../controllers";
import {
  BorderSpinQueueService,
  CountdownService,
  ImageService,
  RenderService,
  SyncAnimationService,
  TextService,
  WidgetService,
} from "../services";
import { MatrixInstanceProvider, PiMatrixClientOptions } from "../types";

const providers = [
  BorderSpinQueueService,
  CountdownService,
  ImageService,
  RenderService,
  SyncAnimationService,
  TextService,
  WidgetService,
  MatrixInstanceProvider,
] as Provider[];

@LibraryModule({
  configuration: {
    [ANIMATION_CACHE_DIRECTORY]: {
      default: "/tmp/rgb-matrix/animations",
      description: "Storage directory for individual frames for an animation",
      type: "string",
    },
    [BORDER_SPIN_LAYER_BOTTLENECK]: {
      default: 5,
      description: [
        "Maximum number of border spin layers to run at once, each layer increases render times",
        "Attempting to run more will force queue",
      ].join(". "),
      type: "number",
    },
    [DEFAULT_ANIMATION_INTERVAL]: {
      default: 100,
      description: "Default time between frames of an image animation (ms)",
      type: "number",
    },
    [FONTS_DIRECTORY]: {
      default: join(cwd(), "fonts"),
      description: "Directory to load .bdf fonts from",
      type: "string",
    },
    [RUNTIME_OPTIONS]: {
      default: {},
      description: "See RuntimeOptions in rpi-led-matrix",
      type: "internal",
    },
    [UPDATE_INTERVAL]: {
      default: 10,
      description: "Maximum delay between renders in ms",
      type: "number",
    },
  },
  imports: [RGBMatrixModule],
  library: LIB_PI_MATRIX_CLIENT,
  providers,
})
export class PiMatrixClientModule {
  public static forRoot({ controllers }: PiMatrixClientOptions): DynamicModule {
    const forRootModule: DynamicModule = {
      imports: [RGBMatrixModule],
      module: PiMatrixClientModule,
      providers,
    };
    if (controllers) {
      forRootModule.controllers = [
        AnimationController,
        MatrixController,
        WidgetController,
      ];
    }

    return forRootModule;
  }
}
