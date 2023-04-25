import { ApplicationModule } from "@digital-alchemy/boilerplate";
import { RGBControllerModule } from "@digital-alchemy/rgb-matrix";
import { ServerModule } from "@digital-alchemy/server";

import { CountdownService } from "../animations";
import {
  ANIMATION_CACHE_DIRECTORY,
  BORDER_SPIN_LAYER_BOTTLENECK,
  DEFAULT_ANIMATION_INTERVAL,
  RUNTIME_OPTIONS,
  UPDATE_INTERVAL,
} from "../config";
import { AnimationController, MatrixController } from "../controllers";
import {
  BorderSpinQueueService,
  ImageService,
  MatrixService,
  NotificationService,
  SyncAnimationService,
  TextService,
} from "../services";

@ApplicationModule({
  application: "pi-matrix",
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
  controllers: [AnimationController, MatrixController],
  imports: [RGBControllerModule, ServerModule],
  providers: [
    BorderSpinQueueService,
    CountdownService,
    ImageService,
    MatrixService,
    NotificationService,
    SyncAnimationService,
    TextService,
  ],
})
export class PiMatrixModule {}
