import { IsDateString, IsString, ValidateNested } from "class-validator";

type MaybePromise<T> = T | Promise<T>;

export class FullCacheObject {
  @ValidateNested()
  public metadata: CacheMetadata;
}

export class CacheMetadata {
  @IsString()
  public application: string;
  @IsString()
  public identifier: string;
  @IsDateString()
  public lastUpdate: string;
}

export interface TypeGenerateInterface<NoResponse extends unknown = void> {
  deleteCache(id: string): MaybePromise<NoResponse>;
  inspectCache(id: string): MaybePromise<FullCacheObject>;
  listCacheMetadata(): MaybePromise<CacheMetadata[]>;
  rebuild(): MaybePromise<NoResponse>;
  setCache(data: FullCacheObject): MaybePromise<NoResponse>;
}
