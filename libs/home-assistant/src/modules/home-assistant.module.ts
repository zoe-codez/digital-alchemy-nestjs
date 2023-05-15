import { LibraryModule, RegisterCache } from "@digital-alchemy/boilerplate";
import { DynamicModule, Provider } from "@nestjs/common";

import {
  BASE_URL,
  CRASH_REQUESTS_PER_SEC,
  HOME_ASSISTANT_PACKAGE_FOLDER,
  LIB_HOME_ASSISTANT,
  RENDER_TIMEOUT,
  RETRY_INTERVAL,
  TOKEN,
  WARN_REQUESTS_PER_SEC,
  WEBSOCKET_URL,
} from "../config";
import { CALL_PROXY, InjectEntityProxy } from "../decorators";
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
  SocketManagerService,
} from "../services";

// ? The "@" symbol cannot appear first, or tsdoc does weird stuff
// If there is a better way to fix this, let me know
/**
 * # TLDR;
 * Use `HomeAssistantModule.forRoot()`
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
  exports: [HassFetchAPIService, HassCallTypeGenerator],
  global: true,
  imports: [RegisterCache()],
  library: LIB_HOME_ASSISTANT,
  providers: [HassFetchAPIService, HassCallTypeGenerator],
})
export class HomeAssistantModule {
  public static forRoot(): DynamicModule {
    const services: Provider[] = [
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
      ...InjectEntityProxy.providers,
      {
        inject: [CallProxyService],
        provide: CALL_PROXY,
        useFactory: (call: CallProxyService) => call.buildCallProxy(),
      },
    ];
    return {
      exports: services,
      global: true,
      imports: [RegisterCache()],
      module: HomeAssistantModule,
      providers: services,
    };
  }
}
