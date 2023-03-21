import { LibraryModule, RegisterCache } from "@digital-alchemy/boilerplate";
import { DynamicModule, Provider } from "@nestjs/common";

import {
  APPLICATION_IDENTIFIER,
  BASE_URL,
  CRASH_REQUESTS_PER_SEC,
  DEFAULT_APPLICATION_IDENTIFIER,
  HOME_ASSISTANT_PACKAGE_FOLDER,
  LIB_HOME_ASSISTANT,
  RENDER_TIMEOUT,
  RETRY_INTERVAL,
  TALK_BACK_BASE_URL,
  TOKEN,
  VERIFICATION_FILE,
  WARN_REQUESTS_PER_SEC,
  WEBSOCKET_URL,
} from "../config";
import { TalkBackController } from "../controllers";
import { CALL_PROXY, InjectEntityProxy, InjectPushEntity } from "../decorators";
import {
  BackupService,
  CallProxyService,
  ConnectionBuilderService,
  EntityManagerService,
  EntityRegistryService,
  EventManagerService,
  HassCallTypeGenerator,
  HassFetchAPIService,
  HassSocketAPIService,
  PushBinarySensorService,
  PushButtonService,
  PushCallService,
  PushEntityConfigService,
  PushEntityService,
  PushProxyService,
  PushSensorService,
  PushSwitchService,
  SocketManagerService,
  TalkBackService,
} from "../services";
import {
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
} from "../types";

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
    [BASE_URL]: {
      default: "http://localhost:8123",
      description: "Url to reach Home Assistant at",
      type: "string",
    },
    [CRASH_REQUESTS_PER_SEC]: {
      default: 500,
      description:
        "Socket service will commit sudoku if more than this many outgoing messages are sent to Home Assistant in a second. Usually indicates runaway code.",
      type: "number",
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
    [RENDER_TIMEOUT]: {
      default: 3,
      description:
        "Max time to wait for template rendering via Home Assistant. This value is used by HA, not the controller.",
      type: "number",
    },
    [RETRY_INTERVAL]: {
      default: 5000,
      description: "How often to retry connecting on connection failure (ms).",
      type: "number",
    },
    [TALK_BACK_BASE_URL]: {
      default: "http://192.168.1.1:7000",
      description: "Base url to use with callbacks in home assistant",
      type: "string",
    },
    [TOKEN]: {
      // Not absolutely required, if the app does not intend to open a connection
      // Should probably use the other module though
      description: "Long lived access token to Home Assistant.",
      type: "string",
    },
    [VERIFICATION_FILE]: {
      default: "digital-alchemy_configuration",
      description:
        "Target file for storing app configurations within the package folder.",
      type: "string",
    },
    [WARN_REQUESTS_PER_SEC]: {
      default: 300,
      description:
        "Emit warnings if the home controller attempts to send more than X messages to Home Assistant inside of a second.",
      type: "number",
    },
    [WEBSOCKET_URL]: {
      description: `Override calculated value if it's breaking or you want something custom. Make sure to use "ws[s]://" scheme.`,
      type: "string",
    },
  },
  exports: [HassFetchAPIService, HassCallTypeGenerator],
  imports: [RegisterCache()],
  library: LIB_HOME_ASSISTANT,
  providers: [HassFetchAPIService, HassCallTypeGenerator],
})
export class HomeAssistantModule {
  public static forRoot(
    options: HomeAssistantModuleConfiguration = {},
  ): DynamicModule {
    const push_services: Provider[] = [
      PushBinarySensorService,
      PushButtonService,
      PushCallService,
      PushEntityConfigService,
      PushEntityService,
      PushProxyService,
      PushSensorService,
      PushSwitchService,
    ];

    const services: Provider[] = [
      ...push_services,
      BackupService,
      CallProxyService,
      ConnectionBuilderService,
      EntityManagerService,
      EntityRegistryService,
      EventManagerService,
      HassCallTypeGenerator,
      HassFetchAPIService,
      HassSocketAPIService,
      SocketManagerService,
      TalkBackService,
      ...InjectEntityProxy.providers,
      ...InjectPushEntity.providers,
      {
        inject: [CallProxyService],
        provide: CALL_PROXY,
        useFactory: (call: CallProxyService) => call.buildCallProxy(),
      },
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
          provide: HOME_ASSISTANT_MODULE_CONFIGURATION,
          useValue: options,
        },
      ],
    };
  }
}
