type None = Promise<void> | void;

export type FullCacheObject = {
  metadata: CacheMetadata;
};

export type CacheMetadata = {
  //
};

export interface TypeGenerateInterface<NoResponse extends unknown = None> {
  deleteCache(id: string): NoResponse;
  inspectCache(id: string): Promise<FullCacheObject>;
  listCacheMetadata(): Promise<CacheMetadata[]>;
  rebuild(): NoResponse;
}
