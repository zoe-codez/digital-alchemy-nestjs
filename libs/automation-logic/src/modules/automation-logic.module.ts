import { DynamicModule } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { LibraryModule, RegisterCache } from "@digital-alchemy/boilerplate";
import { PICK_ENTITY } from "@digital-alchemy/home-assistant";
import { MQTTModule } from "@digital-alchemy/mqtt";

import {
  CIRCADIAN_ENABLED,
  CIRCADIAN_MAX_TEMP,
  CIRCADIAN_MIN_TEMP,
  CIRCADIAN_SENSOR,
  DEFAULT_DIM,
  GRADUAL_DIM_DEFAULT_INTERVAL,
  LIB_AUTOMATION_LOGIC,
  MIN_BRIGHTNESS,
  MQTT_TOPIC_PREFIX,
  SEQUENCE_TIMEOUT,
} from "../config";
import { ROOM_CONFIG_MAP } from "../decorators";
import {
  CircadianService,
  GradualDimService,
  MQTTHealth,
  ScannerService,
  SceneControllerService,
  SceneRoomService,
  SequenceActivateService,
  SolarCalcService,
  StateEnforcerService,
  TransitionRunnerService,
} from "../services";
import {
  AUTOMATION_LOGIC_MODULE_CONFIGURATION,
  AutomationLogicModuleConfiguration,
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
      default: "sensor.light_temperature" as PICK_ENTITY<"sensor">,
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
    [MQTT_TOPIC_PREFIX]: {
      default: "steggy",
      description: "Prefix to use in front of mqtt message topics",
      type: "string",
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
      imports: [DiscoveryModule, RegisterCache(), MQTTModule],
      module: AutomationLogicModule,
      providers: [
        CircadianService,
        GradualDimService,
        MQTTHealth,
        SceneControllerService,
        SceneRoomService,
        SequenceActivateService,
        SolarCalcService,
        ScannerService,
        StateEnforcerService,
        TransitionRunnerService,
        {
          provide: AUTOMATION_LOGIC_MODULE_CONFIGURATION,
          useValue: configuration,
        },
        {
          inject: [ScannerService],
          provide: ROOM_CONFIG_MAP,
          useFactory: (scanner: ScannerService) => scanner.build(),
        },
        ...SceneRoomService.buildProviders(configuration),
      ],
    };
  }
}
