import { LibraryModule } from "@digital-alchemy/boilerplate";
import { NO_SOUND_DEVICE, RGBMatrixModule } from "@digital-alchemy/rgb-matrix";
import { DynamicModule, Provider } from "@nestjs/common";
import { homedir } from "os";
import { join } from "path";
import { cwd } from "process";

import {
  ANIMATION_CACHE_DIRECTORY,
  BORDER_SPIN_LAYER_BOTTLENECK,
  DEFAULT_ANIMATION_INTERVAL,
  DEFAULT_SOUND_DEVICE,
  FONTS_DIRECTORY,
  LIB_PI_MATRIX_CLIENT,
  RUNTIME_OPTIONS,
  SOUND_DIRECTORY,
  UPDATE_INTERVAL,
} from "../config";
import {
  AnimationController,
  MatrixController,
  PixelController,
  WidgetController,
} from "../controllers";
import { SoundController } from "../controllers/sound.controller";
import {
  BorderSpinQueueService,
  CountdownService,
  ImageService,
  PixelService,
  RenderService,
  SoundService,
  SyncAnimationService,
  TextService,
  WidgetService,
} from "../services";
import { MatrixInstanceProvider, PiMatrixClientOptions } from "../types";

const providers = [
  BorderSpinQueueService,
  CountdownService,
  ImageService,
  MatrixInstanceProvider,
  PixelService,
  RenderService,
  SoundService,
  SyncAnimationService,
  TextService,
  WidgetService,
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
    [DEFAULT_SOUND_DEVICE]: {
      default: NO_SOUND_DEVICE,
      description: "Preferred sound device to attempt to play sounds from",
      type: "number",
    },
    [FONTS_DIRECTORY]: {
      default: join(cwd(), "fonts"),
      description:
        "Directory to load .bdf fonts from. A collection comes with the app",
      type: "string",
    },
    [RUNTIME_OPTIONS]: {
      default: {},
      description: "See RuntimeOptions in rpi-led-matrix",
      type: "internal",
    },
    [SOUND_DIRECTORY]: {
      default: join(homedir(), "sound"),
      description: "Directory to load .bdf fonts from",
      type: "string",
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
  public static forRoot({
    withControllers,
  }: PiMatrixClientOptions): DynamicModule {
    const forRootModule: DynamicModule = {
      imports: [RGBMatrixModule],
      module: PiMatrixClientModule,
      providers,
    };
    if (withControllers) {
      forRootModule.controllers = [
        AnimationController,
        MatrixController,
        PixelController,
        SoundController,
        WidgetController,
      ];
    }

    return forRootModule;
  }
}
