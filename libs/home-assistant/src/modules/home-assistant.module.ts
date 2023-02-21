import { DynamicModule, Provider } from "@nestjs/common";
import { LibraryModule, RegisterCache } from "@steggy/boilerplate";

import {
  BASE_URL,
  CRASH_REQUESTS_PER_SEC,
  LIB_HOME_ASSISTANT,
  RENDER_TIMEOUT,
  RETRY_INTERVAL,
  TOKEN,
  WARN_REQUESTS_PER_SEC,
  WEBSOCKET_URL,
} from "../config";
import { CALL_PROXY, InjectEntity } from "../decorators";
import {
  BackupService,
  ConnectionBuilderService,
  EntityManagerService,
  EntityRegistryService,
  HassCallTypeGenerator,
  HassFetchAPIService,
  HassSocketAPIService,
  SocketManagerService,
} from "../services";
import {
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
} from "../types";

/**
 * General purpose module for all Home Assistant interactions.
 * Interact with the proxy API, connect to the websocket, etc.
 *
 * When imported as only a module, only `HassFetchAPIService` is exported.
 *
 * When imported using `.forRoot({  })`, all other functionality is attached
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
      HassSocketAPIService,
      HassFetchAPIService,
      SocketManagerService,
      {
        inject: [HassCallTypeGenerator],
        provide: CALL_PROXY,
        useFactory: (call: HassCallTypeGenerator) => call.buildCallProxy(),
      },
    ];
    return {
      exports: [...services, ...InjectEntity.providers],
      global: true,
      imports: [RegisterCache()],
      module: HomeAssistantModule,
      providers: [
        ...InjectEntity.providers,
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
