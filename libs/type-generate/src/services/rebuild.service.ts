import {
  AutoLogService,
  CompressionService,
  InjectConfig,
} from "@digital-alchemy/boilerplate";
import { Injectable } from "@nestjs/common";
import { existsSync, readdirSync, rmSync } from "fs";
import { join } from "path";

import { TYPES_CACHE_DIRECTORY } from "../config";
import { TypeGenerateInterface } from "../types";

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

  public inspectCache() {
    return undefined;
  }

  public listCacheMetadata() {
    const files = readdirSync(this.cacheDirectory);
    return undefined;
  }

  public rebuild() {
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
