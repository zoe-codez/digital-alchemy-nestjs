import { DynamicModule } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { LibraryModule, RegisterCache } from "@steggy/boilerplate";
import { PICK_ENTITY } from "@steggy/home-assistant";

import {
  CIRCADIAN_ENABLED,
  CIRCADIAN_MAX_TEMP,
  CIRCADIAN_MIN_TEMP,
  CIRCADIAN_SENSOR,
  DEFAULT_DIM,
  GRADUAL_DIM_DEFAULT_INTERVAL,
  LIB_AUTOMATION_LOGIC,
  MIN_BRIGHTNESS,
  SEQUENCE_TIMEOUT,
} from "../config";
import {
  CircadianService,
  EntityToolsService,
  GradualDimService,
  SceneRoomService,
  SequenceActivateService,
  SolarCalcService,
  StateEnforcerService,
  TransitionRunnerService,
} from "../services";
import {
  AutomationLogicModuleConfiguration,
  AUTOMATION_LOGIC_MODULE_CONFIGURATION,
} from "../types";

@LibraryModule({
  configuration: {
    [CIRCADIAN_ENABLED]: {
      default: true,
      description:
        "Take responsibility for generating [CIRCADIAN_SENSOR] and emitting updates",
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
    [CIRCADIAN_SENSOR]: {
      default: "sensor.current_light_temperature" as PICK_ENTITY<"sensor">,
      description: "Sensor for reading / writing current light temperature to",
      type: "string",
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
  library: LIB_AUTOMATION_LOGIC,
})
export class AutomationLogicModule {
  public static forRoot(
    configuration: AutomationLogicModuleConfiguration = {},
  ): DynamicModule {
    return {
      exports: [CircadianService, SceneRoomService, SolarCalcService],
      global: true,
      imports: [DiscoveryModule, RegisterCache()],
      module: AutomationLogicModule,
      providers: [
        CircadianService,
        EntityToolsService,
        GradualDimService,
        StateEnforcerService,
        SceneRoomService,
        SequenceActivateService,
        SolarCalcService,
        TransitionRunnerService,
        {
          provide: AUTOMATION_LOGIC_MODULE_CONFIGURATION,
          useValue: configuration,
        },
      ],
    };
  }
}
