import { CacheModuleOptions, Injectable } from "@nestjs/common";
import { redisStore } from "cache-manager-redis-store";
import { RedisClientOptions } from "redis";

import { CACHE_HOST, CACHE_PORT, CACHE_PROVIDER, CACHE_TTL } from "../config";
import { InjectConfig } from "../decorators/inject-config.decorator";

/**
 * Provider to bind configurations to the cache module
 *
 * Not publicly exported
 */
@Injectable()
export class CacheProviderService {
  constructor(
    @InjectConfig(CACHE_PROVIDER) private readonly cacheProvider: string,
    @InjectConfig(CACHE_HOST) private readonly host: string,
    @InjectConfig(CACHE_PORT) private readonly port: number,
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
      store: redisStore,
      ttl,
    } as RedisClientOptions;
  }
}
