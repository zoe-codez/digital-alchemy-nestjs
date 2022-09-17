import { INestApplication, Injectable } from "@nestjs/common";
import { exit } from "process";

import { SCAN_CONFIG, VERSION } from "../config";
import { InjectConfig } from "../decorators/inject-config.decorator";
import { BootstrapOptions, ScanConfig } from "../includes";

@Injectable()
export class ConfigScanner {
  constructor(
    @InjectConfig(SCAN_CONFIG) private readonly scanConfig: boolean,
    @InjectConfig(VERSION) private readonly printVersion: boolean,
  ) {}

  protected rewire(
    app: INestApplication,
    options: BootstrapOptions,
  ): void | never {
    if (!this.scanConfig && !this.printVersion) {
      return;
    }
    if (this.scanConfig) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(ScanConfig(app, options?.config)));
      exit();
    }
    if (this.printVersion) {
      exit();
    }
  }
}
