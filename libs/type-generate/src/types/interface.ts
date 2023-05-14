type MaybePromise<T> = T | Promise<T>;

export type FullCacheObject = {
  metadata: CacheMetadata;
};

export type CacheMetadata = {
  //
};

export interface TypeGenerateInterface<NoResponse extends unknown = void> {
  deleteCache(id: string): MaybePromise<NoResponse>;
  inspectCache(id: string): MaybePromise<FullCacheObject>;
  listCacheMetadata(): MaybePromise<CacheMetadata[]>;
  rebuild(): MaybePromise<NoResponse>;
}
