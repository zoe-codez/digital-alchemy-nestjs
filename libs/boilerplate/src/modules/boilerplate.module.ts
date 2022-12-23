import { DynamicModule } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

import {
  CACHE_HOST,
  CACHE_PORT,
  CACHE_PREFIX,
  CACHE_PROVIDER,
  CACHE_TTL,
  CONFIG,
  LIB_BOILERPLATE,
  LOG_LEVEL,
  SCAN_CONFIG,
} from "../config";
import { LOGGER_PROVIDERS } from "../decorators";
import { CONFIG_PROVIDERS } from "../decorators/inject-config.decorator";
import { LibraryModule } from "../decorators/library-module.decorator";
import { RegisterCache } from "../includes";
import {
  AutoConfigService,
  AutoLogService,
  CacheProviderService,
  CacheService,
  ConfigScanner,
  EventsExplorerService,
  FetchService,
  LifecycleService,
  LogExplorerService,
  ModuleScannerService,
  ScheduleExplorerService,
  WorkspaceService,
} from "../services";

@LibraryModule({
  configuration: {
    [CACHE_HOST]: {
      default: "localhost",
      description:
        "Configuration property for cache provider, does not apply to memory caching",
      type: "string",
    },
    [CACHE_PORT]: {
      // If other cache providers are implemented, the default value should will be removed
      // The value default value will need to be determined programmatically (should keep backwards compatibility)
      default: 6379,
      description:
        "Configuration property for cache provider, does not apply to memory caching",
      type: "number",
    },
    [CACHE_PREFIX]: {
      description: [
        "Use a prefix with all cache keys",
        "If blank, then application name is used",
      ].join(`. `),
      type: "string",
    },
    [CACHE_PROVIDER]: {
      default: "memory",
      description: "Redis is preferred if available",
      enum: ["redis", "memory"],
      type: "string",
    },
    [CACHE_TTL]: {
      default: 86_400,
      description: "Configuration property for cache provider",
      type: "number",
    },
    [CONFIG]: {
      description: [
        "Consumable as CLI switch only",
        "If provided, all other file based configurations will be ignored",
        "Environment variables + CLI switches will operate normally",
      ].join(". "),
      type: "string",
    },
    [LOG_LEVEL]: {
      default: "info",
      description: "Minimum log level to process",
      enum: ["silent", "info", "warn", "debug", "error"],
      type: "string",
    },
    [SCAN_CONFIG]: {
      default: false,
      description: "Find all application configurations and output as json",
      type: "boolean",
    },
  },
  exports: [
    AutoConfigService,
    AutoLogService,
    CacheProviderService,
    CacheService,
    FetchService,
    WorkspaceService,
  ],
  imports: [RegisterCache(), DiscoveryModule],
  library: LIB_BOILERPLATE,
  providers: [
    AutoConfigService,
    AutoLogService,
    CacheProviderService,
    CacheService,
    ConfigScanner,
    EventsExplorerService,
    FetchService,
    LifecycleService,
    LogExplorerService,
    ModuleScannerService,
    ScheduleExplorerService,
    WorkspaceService,
  ],
})
export class BoilerplateModule {
  public static RegisterCache = RegisterCache;
  public static forRoot(): DynamicModule {
    // @InjectConfig()
    const config = [...CONFIG_PROVIDERS.values()];
    // @InjectLogger()
    const transientLoggers = [...LOGGER_PROVIDERS.values()];

    return {
      exports: [
        ...config,
        ...transientLoggers,
        AutoLogService,
        AutoConfigService,
        CacheProviderService,
        FetchService,
        ModuleScannerService,
        WorkspaceService,
      ],
      global: true,
      imports: [RegisterCache(), DiscoveryModule],
      module: BoilerplateModule,
      providers: [
        ...config,
        ...transientLoggers,
        AutoLogService,
        AutoConfigService,
        CacheProviderService,
        EventsExplorerService,
        FetchService,
        LifecycleService,
        LogExplorerService,
        ModuleScannerService,
        ScheduleExplorerService,
        WorkspaceService,
      ],
    };
  }

  constructor(private readonly discovery: LogExplorerService) {}

  protected configure(): void {
    this.discovery.load();
  }
}
