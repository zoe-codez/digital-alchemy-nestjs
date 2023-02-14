import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";

import { CACHE_PREFIX } from "../config";
import { ACTIVE_APPLICATION } from "../contracts";
import { InjectConfig } from "../decorators/inject-config.decorator";

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
    this.prefix ||= activeApplication;
  }

  public async del(key: string): Promise<void> {
    key = `${this.prefix}${key}`;
    await this.cache.del(key);
  }

  public async get<T>(key: string, defaultValue?: T): Promise<T> {
    key = `${this.prefix}${key}`;
    return (await this.cache.get(key)) ?? defaultValue;
  }

  public async keys(key = "*"): Promise<string[]> {
    key = `${this.prefix}${key}`;
    return await this.cache.store.keys(key);
  }

  public async set(key: string, value: unknown, ttl?: number) {
    key = `${this.prefix}${key}`;
    await this.cache.set(key, value, ttl);
  }
}
