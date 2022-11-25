import { DiscoveryModule } from "@nestjs/core";
import { LibraryModule, RegisterCache } from "@steggy/boilerplate";
import { HomeAssistantModule } from "@steggy/home-assistant";

import {
  CIRCADIAN_ENABLED,
  CIRCADIAN_MAX_TEMP,
  CIRCADIAN_MIN_TEMP,
  DEFAULT_DIM,
  GRADUAL_DIM_DEFAULT_INTERVAL,
  MIN_BRIGHTNESS,
  SEQUENCE_TIMEOUT,
} from "../config";
import {
  CircadianService,
  EntityToolsService,
  GradualDimService,
  QuickActionService,
  SceneRoomService,
  SequenceActivateService,
  SolarCalcService,
  TransitionRunnerService,
} from "../services";

@LibraryModule({
  configuration: {
    [CIRCADIAN_ENABLED]: {
      default: true,
      description:
        "Setting to false will prevent lights from having their temperature managed",
      type: "boolean",
    },
    [CIRCADIAN_MAX_TEMP]: {
      default: 5500,
      description:
        "Maximum color temperature for circadian lighting. Used at solar noon",
      type: "number",
    },
    [CIRCADIAN_MIN_TEMP]: {
      default: 2000,
      description:
        "Minimum color temperature for circadian lighting. Used while it's dark out",
      type: "number",
    },
    [DEFAULT_DIM]: {
      default: 50,
      description:
        "Default amount to move light brightness by if not otherwise specified",
      type: "number",
    },
    [GRADUAL_DIM_DEFAULT_INTERVAL]: {
      default: 500,
      description: "Default time chunk size for gradual dim operations",
      type: "number",
    },
    [MIN_BRIGHTNESS]: {
      default: 5,
      description:
        "Enforce a number higher than 1 for min brightness in dimmers. Some lights do weird stuff at low numbers",
      type: "number",
    },
    [SEQUENCE_TIMEOUT]: {
      default: 1500,
      description:
        "When tracking state changes for a sequence event, another change must happen inside this time window",
      type: "number",
    },
  },
  exports: [CircadianService, SceneRoomService, SolarCalcService],
  imports: [HomeAssistantModule, DiscoveryModule, RegisterCache()],
  library: Symbol("automation-logic"),
  providers: [
    CircadianService,
    EntityToolsService,
    GradualDimService,
    QuickActionService,
    SceneRoomService,
    SequenceActivateService,
    SolarCalcService,
    TransitionRunnerService,
  ],
})
export class ControllerLogicModule {}
