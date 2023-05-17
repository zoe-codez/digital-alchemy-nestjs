import { LibraryModule, RegisterCache } from "@digital-alchemy/boilerplate";
import { DynamicModule, Provider } from "@nestjs/common";

import {
  APPLICATION_IDENTIFIER,
  DEFAULT_APPLICATION_IDENTIFIER,
  HOME_ASSISTANT_PACKAGE_FOLDER,
  LIB_PUSH_ENTITY,
  TALK_BACK_BASE_URL,
} from "../config";
import { TalkBackController } from "../controllers";
import { InjectPushEntity } from "../decorators";
import {
  PushBinarySensorService,
  PushButtonService,
  PushEntityConfigService,
  PushEntityService,
  PushProxyService,
  PushSensorService,
  PushSwitchService,
  TalkBackService,
} from "../services";
import {
  PUSH_ENTITY_MODULE_CONFIGURATION,
  PushEntityModuleConfiguration,
} from "../types";

const PUSH_SERVICES: Provider[] = [
  PushBinarySensorService,
  PushButtonService,
  PushEntityConfigService,
  PushEntityService,
  PushProxyService,
  PushSensorService,
  PushSwitchService,
];
// ? The "@" symbol cannot appear first, or tsdoc does weird stuff
// If there is a better way to fix this, let me know
/**
 * General purpose module for all Home Assistant interactions.
 * Interact with the proxy API, connect to the websocket, etc.
 *
 * ## Basic Import
 *
 * > Only `HassFetchAPIService` is available
 *
 * ```typescript
 * ; @ApplicationModule({
 *   imports: [HomeAssistantModule]
 * })
 * class MyApplication {}
 * ```
 *
 * ## All functionality
 *
 * ```typescript
 * ; @ApplicationModule({
 *   imports: [
 *     HomeAssistantModule.forRoot({
 *       // application configuration
 *     })
 *   ]
 * })
 * class MyApplication {}
 * ```
 *
 * - web sockets
 * - push entities
 * - event bindings
 * - proxy api
 * - entity management
 *
 * ### Caching note
 *
 * Push entities are intended to work with a persistent caching store like redis.
 * Information such as state may be lost after process restarts when using in-memory stores.
 */
@LibraryModule({
  configuration: {
    [APPLICATION_IDENTIFIER]: {
      default: DEFAULT_APPLICATION_IDENTIFIER,
      description: [
        "The partial entity_id the represents this application to Home Assistant",
        `If left as default, it will be replaced with the application name, with "-" changed to "_"`,
        `Used to generate ids like: "binary_sensor.{app}_online"`,
      ].join(". "),
      type: "string",
    },
    [HOME_ASSISTANT_PACKAGE_FOLDER]: {
      // ? Dev note: if running multiple apps from a single repository (like this repo does), this value should be shared
      // values are actually nested 1 folder deeper: packages/{APPLICATION_IDENTIFIER}/...
      default: "/path/to/homeassistant/packages/",
      description: [
        "Packages folder to write push entity info to, this will need to be manually included to make operational",
        "Value only used with push entity configurations, incorrect values will not affect normal websocket operation",
      ].join(`. `),
      type: "string",
    },
    [TALK_BACK_BASE_URL]: {
      default: "http://192.168.1.100:7000",
      description: "Base url to use with callbacks in home assistant",
      type: "string",
    },
  },
  exports: [...PUSH_SERVICES, TalkBackService],
  imports: [RegisterCache()],
  library: LIB_PUSH_ENTITY,
  providers: [...PUSH_SERVICES, TalkBackService],
})
export class HomeAssistantModule {
  public static forRoot(
    options: PushEntityModuleConfiguration = {},
  ): DynamicModule {
    const services: Provider[] = [
      ...PUSH_SERVICES,
      ...InjectPushEntity.providers,
      TalkBackService,
    ];
    options.controllers ??= false;
    return {
      controllers: options.controllers ? [TalkBackController] : [],
      exports: services,
      global: true,
      imports: [RegisterCache()],
      module: HomeAssistantModule,
      providers: [
        ...services,
        {
          provide: PUSH_ENTITY_MODULE_CONFIGURATION,
          useValue: options,
        },
      ],
    };
  }
}
