import { Injectable } from "@nestjs/common";
import { AutoLogService, InjectConfig } from "@steggy/boilerplate";
import {
  InjectPushEntity,
  PUSH_PROXY,
  PushProxyService,
} from "@steggy/home-assistant";
import execa from "execa";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dump } from "js-yaml";
import { join } from "path";

const VERIFICATION_FILE = `steggy_verification`;

@Injectable()
export class ExampleService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly registry: PushProxyService,
    @InjectPushEntity("sensor.entity_creation_sensor")
    private readonly pushSensor: PUSH_PROXY<"sensor.entity_creation_sensor">,
    @InjectConfig("HOME_ASSISTANT_FOLDER", { type: "string" })
    private readonly homeAssistant: string,
  ) {}

  protected async onPostInit() {
    await this.dumpConfiguration();
  }

  private async cleanup(path: string): Promise<boolean> {
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
    const path = join(this.homeAssistant, "steggy");
    const status = await this.cleanup(path);
    if (!status) {
      this.logger.warn(`Aborting configuration dump`);
      return;
    }
    this.logger.info(`Starting build`);
    const list = this.registry.applicationYaml();
    mkdirSync(path);
    writeFileSync(join(path, VERIFICATION_FILE), "", "utf8");
    writeFileSync(join(path, "steggy.yaml"), dump(list), "utf8");
  }
}
