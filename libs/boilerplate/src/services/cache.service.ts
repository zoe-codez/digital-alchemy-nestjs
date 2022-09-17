import {
  CACHE_MANAGER,
  CacheModuleOptions,
  Inject,
  Injectable,
} from "@nestjs/common";
import { CacheModule, DynamicModule } from "@nestjs/common";
import { Cache } from "cache-manager";
import RedisStore from "cache-manager-redis-store";

import { CACHE_PROVIDER, CACHE_TTL, REDIS_HOST, REDIS_PORT } from "../config";
import { InjectConfig } from "../decorators/inject-config.decorator";

export function RegisterCache(): DynamicModule {
  return CacheModule.registerAsync({
    inject: [CacheProviderService],
    useFactory: (config: CacheProviderService) => config.getConfig(),
  });
}

// Because Cache collides with a nodejs variable
// Trying to import it with autocomplete is annoying
/**
 * Use with `@InjectCache()`
 */
export type CacheManagerService = Cache;
export const CacheManagerService = undefined;
export function InjectCache(): ReturnType<typeof Inject> {
  return Inject(CACHE_MANAGER);
}

/**
 * Provider to bind configurations to the cache module
 */
@Injectable()
export class CacheProviderService {
  public static RegisterCache = RegisterCache;

  constructor(
    @InjectConfig(CACHE_PROVIDER) private readonly cacheProvider: string,
    @InjectConfig(REDIS_HOST) private readonly host: string,
    @InjectConfig(REDIS_PORT) private readonly port: number,
    @InjectConfig(CACHE_TTL) private readonly defaultTtl: number,
  ) {}

  public getConfig(): CacheModuleOptions {
    const ttl = this.defaultTtl;
    if (this.cacheProvider === "memory") {
      return {
        isGlobal: true,
        ttl,
      };
    }
    return {
      host: this.host,
      isGlobal: true,
      port: this.port,
      store: RedisStore,
      ttl,
    };
  }
}
