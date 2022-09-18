import { DynamicModule } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

import {
  CACHE_PROVIDER,
  CACHE_TTL,
  CONFIG,
  LIB_BOILERPLATE,
  LOG_LEVEL,
  REDIS_HOST,
  REDIS_PORT,
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
    [CACHE_PROVIDER]: {
      default: "memory",
      description: "Redis is preferred if available",
      enum: ["redis", "memory"],
      type: "string",
    },
    [CACHE_TTL]: {
      default: 86_400,
      description: "Configuration property for redis connection",
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
      enum: ["info", "warn", "debug"],
      type: "string",
    },
    [REDIS_HOST]: {
      default: "localhost",
      description: "Configuration property for redis connection",
      type: "string",
    },
    [REDIS_PORT]: {
      default: 6379,
      description: "Configuration property for redis connection",
      type: "number",
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
    FetchService,
    WorkspaceService,
  ],
  imports: [RegisterCache(), DiscoveryModule],
  library: LIB_BOILERPLATE,
  providers: [
    AutoConfigService,
    AutoLogService,
    CacheProviderService,
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
