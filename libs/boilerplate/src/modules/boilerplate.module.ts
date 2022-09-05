import {
  DynamicModule,
  ForwardReference,
  Provider,
  Type,
} from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { START } from "@steggy/utilities";

import {
  CACHE_PROVIDER,
  CACHE_TTL,
  CONFIG,
  LIB_BOILERPLATE,
  LOG_LEVEL,
  REDIS_HOST,
  REDIS_PORT,
  SCAN_CONFIG,
  VERSION,
} from "../config";
import { iLogger } from "../contracts";
import { LOGGER_PROVIDERS } from "../decorators/injectors";
import { CONFIG_PROVIDERS } from "../decorators/injectors/inject-config.decorator";
import { LibraryModule } from "../decorators/library-module.decorator";
import { RegisterCache } from "../includes";
import {
  AutoConfigService,
  AutoLogService,
  CacheProviderService,
  ConfigScanner,
  EventsExplorerService,
  FetchService,
  JSONFilterService,
  LifecycleService,
  LogExplorerService,
  ModuleScannerService,
  ScheduleExplorerService,
  WorkspaceService,
} from "../services";

interface ModuleOptions {
  logger?: {
    imports: Array<
      Type | DynamicModule | Promise<DynamicModule> | ForwardReference
    >;
    logger: Provider<iLogger>;
  };
}

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
    [VERSION]: {
      default: false,
      description: "Print the application version, then exit",
      type: "boolean",
    },
  },
  exports: [
    AutoConfigService,
    AutoLogService,
    CacheProviderService,
    FetchService,
    JSONFilterService,
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
    JSONFilterService,
    LifecycleService,
    LogExplorerService,
    ModuleScannerService,
    ScheduleExplorerService,
    WorkspaceService,
  ],
})
export class BoilerplateModule {
  public static RegisterCache = RegisterCache;
  public static forRoot(options: ModuleOptions = {}): DynamicModule {
    // @InjectConfig()
    const config = [...CONFIG_PROVIDERS.values()];
    // @InjectLogger()
    const transientLoggers = [...LOGGER_PROVIDERS.values()];
    const logger: Provider<iLogger> = options.logger?.logger ?? AutoLogService;
    const imports = options.logger?.imports ?? [];

    return {
      exports: [
        ...config,
        ...transientLoggers,
        logger,

        AutoConfigService,
        CacheProviderService,
        FetchService,
        JSONFilterService,
        ModuleScannerService,
        WorkspaceService,
      ],
      global: true,
      imports: [RegisterCache(), DiscoveryModule, ...imports],
      module: BoilerplateModule,
      providers: [
        ...config,
        ...transientLoggers,
        logger,

        AutoConfigService,
        CacheProviderService,
        EventsExplorerService,
        FetchService,
        JSONFilterService,
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
