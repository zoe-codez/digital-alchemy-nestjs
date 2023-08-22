import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";

import { CACHE_PREFIX } from "../config";
import { InjectConfig } from "../decorators/inject-config.decorator";
import { ACTIVE_APPLICATION } from "../types";

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    @Inject(ACTIVE_APPLICATION)
    private readonly activeApplication: string,
    @InjectConfig(CACHE_PREFIX)
    private readonly prefix: string,
  ) {
    this.prefix ||= this.activeApplication;
  }

  public async del(key: string): Promise<void> {
    key = `${this.prefix}${key}`;
    await this.cache.del(key);
  }

  public async get<VALUE>(key: string, defaultValue?: VALUE): Promise<VALUE> {
    key = `${this.prefix}${key}`;
    return (await this.cache.get(key)) ?? defaultValue;
  }

  public async keys(key = "*"): Promise<string[]> {
    key = `${this.prefix}${key}`;
    return await this.cache.store.keys(key);
  }

  // ? type added for easy validation
  public async set<VALUE>(key: string, value: VALUE, ttl?: number) {
    key = `${this.prefix}${key}`;
    await this.cache.set(key, value, ttl);
  }
}
