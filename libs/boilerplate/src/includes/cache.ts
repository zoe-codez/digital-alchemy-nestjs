import {
  CACHE_MANAGER,
  CacheModule,
  DynamicModule,
  Inject,
} from "@nestjs/common";

import { CacheProviderService } from "../services";

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
