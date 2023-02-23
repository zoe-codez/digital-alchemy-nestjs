import { DynamicModule, Provider } from "@nestjs/common";
import { LibraryModule, RegisterCache } from "@steggy/boilerplate";

import {
  BASE_URL,
  CRASH_REQUESTS_PER_SEC,
  HOME_ASSISTANT_PACKAGE_FOLDER,
  LIB_HOME_ASSISTANT,
  RENDER_TIMEOUT,
  RETRY_INTERVAL,
  TALK_BACK_BASE_URL,
  TOKEN,
  WARN_REQUESTS_PER_SEC,
  WEBSOCKET_URL,
} from "../config";
import { TalkBackController } from "../controllers";
import { CALL_PROXY, InjectEntityProxy, InjectPushEntity } from "../decorators";
import {
  BackupService,
  ConnectionBuilderService,
  EntityManagerService,
  EntityRegistryService,
  HassCallTypeGenerator,
  HassFetchAPIService,
  HassSocketAPIService,
  PushBinarySensorService,
  PushButtonService,
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
      default: "/path/to/homeassistant/packages/my_app_package",
      description: [
        "Used with the entity push entity creation process",
        "This should be a folder reachable via a configuration.yaml !include directive inside Home Assistant",
        "If multiple applications will be included, they must all share a common root folder for proper type merging",
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
      default: "http://192.168.1.223:7000",
      description: "Base url to use with callbacks in home assistant",
      type: "string",
    },
    [TOKEN]: {
      // Not absolutely required, if the app does not intend to open a connection
      // Should probably use the other module though
      description: "Long lived access token to Home Assistant.",
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
  exports: [HassFetchAPIService],
  imports: [RegisterCache()],
  library: LIB_HOME_ASSISTANT,
  providers: [HassFetchAPIService],
})
export class HomeAssistantModule {
  public static forRoot(
    options: HomeAssistantModuleConfiguration = {},
  ): DynamicModule {
    const services: Provider[] = [
      BackupService,
      ConnectionBuilderService,
      EntityManagerService,
      EntityRegistryService,
      HassFetchAPIService,
      HassSocketAPIService,
      PushBinarySensorService,
      PushButtonService,
      PushEntityConfigService,
      PushEntityService,
      PushProxyService,
      PushSensorService,
      PushSwitchService,
      SocketManagerService,
      TalkBackService,
      ...InjectEntityProxy.providers,
      ...InjectPushEntity.providers,
      {
        inject: [HassCallTypeGenerator],
        provide: CALL_PROXY,
        useFactory: (call: HassCallTypeGenerator) => call.buildCallProxy(),
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
        HassCallTypeGenerator,
        {
          provide: HOME_ASSISTANT_MODULE_CONFIGURATION,
          useValue: options,
        },
      ],
    };
  }
}
