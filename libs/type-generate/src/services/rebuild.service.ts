import {
  AutoLogService,
  CompressionService,
  InjectConfig,
} from "@digital-alchemy/boilerplate";
import { Injectable, NotImplementedException } from "@nestjs/common";
import { existsSync, readdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";

import { TYPES_CACHE_DIRECTORY } from "../config";
import { FullCacheObject, TypeGenerateInterface } from "../types";

// eslint-disable-next-line spellcheck/spell-checker
const EXTENSION = "datg";

@Injectable()
export class RebuildService implements TypeGenerateInterface<boolean> {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig(TYPES_CACHE_DIRECTORY)
    private readonly cacheDirectory: string,
    private readonly compression: CompressionService,
  ) {}

  public deleteCache(id: string) {
    const path = this.cachePath(id);
    if (!existsSync(path)) {
      this.logger.warn(
        { path },
        `[%s] cache does not exist, delete failed successfully`,
        id,
      );
      return true;
    }
    try {
      rmSync(path);
      this.logger.debug(`[%s] cache deleted`, id);
      return true;
    } catch (error) {
      this.logger.error({ error, path }, `[%s] failed to delete cache`, id);
      return false;
    }
  }

  public inspectCache(cache: string) {
    const contents = readFileSync(join(this.cacheDirectory, cache), "utf8");
    return this.compression.unserialize<FullCacheObject>(contents);
  }

  public listCacheMetadata() {
    return readdirSync(this.cacheDirectory)
      .filter(i => i.endsWith(EXTENSION))
      .map(i => {
        const decoded = this.inspectCache(i);
        return decoded.metadata;
      });
  }

  public rebuild() {
    throw new NotImplementedException();
    return undefined;
  }

  protected onModuleInit() {
    if (existsSync(this.cacheDirectory)) {
      this.logger.trace(`Cache directory exists {%s}`, this.cacheDirectory);
      return;
    }
    this.logger.warn(`Initializing cache directory {%s}`, this.cacheDirectory);
  }

  private cachePath(id: string): string {
    return join(this.cacheDirectory, id);
  }
}
