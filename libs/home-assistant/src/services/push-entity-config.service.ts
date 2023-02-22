import { Injectable } from "@nestjs/common";
import { AutoLogService, InjectConfig } from "@steggy/boilerplate";
import execa from "execa";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dump } from "js-yaml";
import { join } from "path";

import { HOME_ASSISTANT_PACKAGE_FOLDER } from "../config";
import { HassFetchAPIService } from "./hass-fetch-api.service";
import { PushProxyService } from "./push-proxy.service";

const VERIFICATION_FILE = `steggy_verification`;

/**
 * Functionality for managing a particular application's push entity configuration within Home Assistant.
 *
 * This class will claim a folder as it's own for management, maintaining code that reflects the application state.
 * It will also generate a series of additional entities to reflect the application state within Home Assistant
 */
@Injectable()
export class PushEntityConfigService {
  constructor(
    @InjectConfig(HOME_ASSISTANT_PACKAGE_FOLDER)
    private readonly targetFolder: string,
    private readonly logger: AutoLogService,
    private readonly fetch: HassFetchAPIService,
    private readonly registry: PushProxyService,
  ) {}

  public async rebuild(): Promise<void> {
    this.logger.error(this.targetFolder);
    return;
    await this.dumpConfiguration();
    await this.verifyYaml();
  }

  private async cleanup(): Promise<boolean> {
    const path = this.targetFolder;
    if (!existsSync(join(path, VERIFICATION_FILE)) && existsSync(path)) {
      this.logger.error(
        { path },
        `exists without a verification file, clean up manually`,
      );
      return false;
    }
    this.logger.info({ path }, `dropping existing configuration`);
    await execa("rm", ["-rf", path]);
    return true;
  }

  private async dumpConfiguration(): Promise<void> {
    const status = await this.cleanup();
    if (!status) {
      this.logger.warn(`Aborting configuration dump`);
      return;
    }
    this.logger.debug(`Starting build`);
    const list = this.registry.applicationYaml();
    mkdirSync(this.targetFolder);
    writeFileSync(join(this.targetFolder, VERIFICATION_FILE), "", "utf8");
    writeFileSync(join(this.targetFolder, "include.yaml"), dump(list), "utf8");
    this.logger.debug(`Done`);
  }

  private async verifyYaml(): Promise<void> {
    this.logger.debug(`Verifying configuration`);
    const result = await this.fetch.checkConfig();
    if (result.result === "valid") {
      this.logger.warn(`Write succeeded!`);
      return;
    }
    this.logger.error({ error: result.errors }, `Configuration check failed`);
  }
}
