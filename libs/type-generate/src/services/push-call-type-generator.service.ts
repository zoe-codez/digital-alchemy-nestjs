import {
  ACTIVE_APPLICATION,
  AutoLogService,
  CompressionService,
  InjectConfig,
} from "@digital-alchemy/boilerplate";
import { HOME_ASSISTANT_PACKAGE_FOLDER } from "@digital-alchemy/home-assistant";
import { deepExtend, is } from "@digital-alchemy/utilities";
import { Inject, Injectable } from "@nestjs/common";
import { existsSync, lstatSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

import { VERIFICATION_FILE } from "../config";
import { HassDigitalAlchemySerializeState } from "../types";

type ModuleConfigurations = Map<string, HassDigitalAlchemySerializeState>;

@Injectable()
export class PushCallService {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig(HOME_ASSISTANT_PACKAGE_FOLDER)
    private readonly targetFolder: string,
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    @InjectConfig(VERIFICATION_FILE)
    private readonly verificationFile: string,
    private readonly compression: CompressionService,
  ) {}

  public async buildTypes(): Promise<GenerateEntities> {
    const verified = this.loadAllPotentialConfigurations();
    const assembled = {};
    verified.forEach(({ plugins, application }) => {
      if (is.empty(configuration.generate_entities)) {
        return;
      }
      this.logger.info(`[%s] loading configuration`, application);
      deepExtend(assembled, configuration.generate_entities);
    });
    return assembled;
  }

  private loadAllPotentialConfigurations(): ModuleConfigurations {
    if (!existsSync(this.targetFolder)) {
      this.logger.error(
        { target: this.targetFolder },
        `Target folder does not exist`,
      );
      return;
    }
    const configurations = new Map();
    const contents = readdirSync(this.targetFolder);
    contents.forEach(path => {
      const base = join(this.targetFolder, path);
      const check = lstatSync(base).isDirectory();
      if (!check) {
        this.logger.debug(`Skipping path {%s}`, path);
        return;
      }
      const verificationPath = join(base, this.verificationFile);
      if (!existsSync(verificationPath)) {
        this.logger.error({ path: verificationPath }, `Data dump missing`);
        return;
      }
      const info = readFileSync(verificationPath, "utf8");
      const data = this.compression.unserialize(
        info,
        HassDigitalAlchemySerializeState,
      );
      if (is.undefined(data)) {
        this.logger.error({}, `Malformed data dump`);
        return;
      }
      configurations.set(path, data);
    });
    return configurations;
  }
}
