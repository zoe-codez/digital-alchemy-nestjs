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
import {
  HassSteggySerializeState,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
  PUSH_PROXY,
  SERIALIZE,
} from "../types";
import { HassFetchAPIService } from "./hass-fetch-api.service";
import { PushEntityService } from "./push-entity.service";
import { PushProxyService } from "./push-proxy.service";

/**
 * Stored as mildly obfuscated
 */
const VERIFICATION_FILE = `steggy_configuration`;
const boot = dayjs();

export type InjectedPushConfig = {
  storage: () => [name: string, data: object];
  yaml: () => [filename: string, data: object][];
};

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
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
    private readonly logger: AutoLogService,
    private readonly fetch: HassFetchAPIService,
    private readonly pushProxy: PushProxyService,
    private readonly pushEntity: PushEntityService,
  ) {}

  /**
   * Mapping between mount points and extra data.
   *
   * > example: ["mqtt", { ... }]
   */
  public readonly LOCAL_PLUGINS = new Map<string, InjectedPushConfig>();

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
    mkdirSync(this.targetFolder);
    writeFileSync(
      join(this.targetFolder, VERIFICATION_FILE),
      // ? obfuscate to discourage tampering, not intended to actually "hide" data
      // tampering could result in the generation of types that reflect neither the yaml nor application runtime state
      // no human should mess with that info by hand, just generate it again
      SERIALIZE.serialize(this.serializeState()),
      "utf8",
    );
    const rootYaml = this.pushProxy.applicationYaml(this.targetFolder);
    writeFileSync(
      join(this.targetFolder, "include.yaml"),
      dump(rootYaml),
      "utf8",
    );
    this.logger.debug(`Done`);
  }

  /**
   * Automatically generate a few entities that should apply across any app.
   * This will grow in the future, but also become more configurable.
   *
   * ## Current
   *
   * ### `sensor.{app}_last_build`
   *
   * Timestamp to describe the last time this application dumped it's configuration successfully to Home Assistant
   *
   * ### `sensor.{app}_uptime` **(required)**
   *
   * Increasing number sensor.
   * Measures seconds since the process last booted
   *
   * ### `binary_sensor.{app}_online` **(required)**
   *
   * Binary sensor which flips to off 30 seconds after failing to receive an uptime update.
   * This sensor controls availability of all other entities related to this application
   *
   * ## Planned
   *
   * ### `button.{app}_rebuild`
   *
   * Initiate configuration dump on demand, then restart Home Assistant (gated behind a config flag, default: off)
   *
   * ### `[binary_sensor|update].{app}_config_current`
   *
   * Is the current dumped data accurate to what is running?
   * Operates by looking at filesystem, does not reflect the state that is loaded into the running state of Home Assistant
   *
   * ### `binary_sensor.{app}_config_running`
   *
   * Is Home Assistant currently running with a yaml package that is current?
   * If the setup requires a restart, this will remain false until the newest code is loaded.
   */
  private async initialize() {
    // * `binary_sensor.{app}_online`
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

    // * `sensor.{app}_last_build`
    const last_build_id = `sensor.app_${this.application.replace(
      "-",
      "_",
    )}_last_build` as PICK_GENERATED_ENTITY<"sensor">;
    this.pushEntity.insert(last_build_id, {
      device_class: "timestamp",
      name: `${TitleCase(this.application)} Last Config Build`,
    });
    this.lastBuildDate = await this.pushProxy.createPushProxy(last_build_id);

    // *  `sensor.{app}_uptime`
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
  }

  private serializeState(): HassSteggySerializeState {
    return {
      application: this.application,
      configuration: this.configuration,
      plugins: [...this.LOCAL_PLUGINS.entries()].map(([name, data]) => ({
        name,
        storage: data.storage(),
        yaml: data.yaml(),
      })),
    };
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
