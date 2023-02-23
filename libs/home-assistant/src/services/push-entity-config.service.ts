import { Inject, Injectable } from "@nestjs/common";
import {
  ACTIVE_APPLICATION,
  AutoLogService,
  Cron,
  InjectConfig,
} from "@steggy/boilerplate";
import { CronExpression, TitleCase } from "@steggy/utilities";
import dayjs from "dayjs";
import execa from "execa";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dump } from "js-yaml";
import { join } from "path";

import { HOME_ASSISTANT_PACKAGE_FOLDER } from "../config";
import { PICK_GENERATED_ENTITY, PUSH_PROXY } from "../types";
import { HassFetchAPIService } from "./hass-fetch-api.service";
import { PushEntityService } from "./push-entity.service";
import { PushProxyService } from "./push-proxy.service";

const VERIFICATION_FILE = `steggy_verification`;
const boot = dayjs();

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
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly logger: AutoLogService,
    private readonly fetch: HassFetchAPIService,
    private readonly pushProxy: PushProxyService,
    private readonly pushEntity: PushEntityService,
  ) {}

  /**
   * ID will be different
   */
  private lastBuildDate: PUSH_PROXY<"sensor.last_build_date">;
  /**
   * ID will be different
   */
  private onlineProxy: PUSH_PROXY<"binary_sensor.online">;
  /**
   * ID will be different
   */
  private uptimeProxy: PUSH_PROXY<"sensor.online">;

  public async rebuild(): Promise<void> {
    await this.dumpConfiguration();
    await this.verifyYaml();
  }

  protected async onModuleInit() {
    await this.initialize();
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  protected sendHealthCheck() {
    if (!this.onlineProxy) {
      this.logger.warn(`Cannot send uptime, no proxy available`);
      return;
    }
    this.onlineProxy.state = true;
    this.uptimeProxy.state = dayjs().diff(boot, "second");
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
    const list = this.pushProxy.applicationYaml();
    mkdirSync(this.targetFolder);
    writeFileSync(join(this.targetFolder, VERIFICATION_FILE), "", "utf8");
    writeFileSync(join(this.targetFolder, "include.yaml"), dump(list), "utf8");
    this.logger.debug(`Done`);
  }

  private async initialize() {
    // binary sensor / currently online
    const online_id = `binary_sensor.app_${this.application.replace(
      "-",
      "_",
    )}_online` as PICK_GENERATED_ENTITY<"binary_sensor">;
    this.pushEntity.insert(online_id, {
      /**
       * This sensor should always be available, regardless of application state.
       *
       * The delay_off manages the available for all the other connected entities
       */
      availability: "1",
      delay_off: {
        seconds: 30,
      },
      name: `${TitleCase(this.application)} Online`,
      track_history: true,
    });
    this.onlineProxy = await this.pushProxy.createPushProxy(online_id);

    // sensor / last_build_date (yaml)
    const last_build_id = `sensor.app_${this.application.replace(
      "-",
      "_",
    )}_last_build` as PICK_GENERATED_ENTITY<"sensor">;
    this.pushEntity.insert(last_build_id, {
      device_class: "timestamp",
      name: `${TitleCase(this.application)} Last Config Build`,
    });
    this.lastBuildDate = await this.pushProxy.createPushProxy(last_build_id);

    // sensor / uptime
    const uptime_id = `sensor.app_${this.application.replace(
      "-",
      "_",
    )}_uptime` as PICK_GENERATED_ENTITY<"sensor">;
    this.pushEntity.insert(uptime_id, {
      device_class: "duration",
      name: `${TitleCase(this.application)} Uptime`,
      track_history: true,
      unit_of_measurement: "s",
    });
    this.uptimeProxy = await this.pushProxy.createPushProxy(uptime_id);

    // last hash = [sensor]
    // manual rebuild = [button]
    // requires rebuild = [update]
    // pending restart = [binary_sensor / update]
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
