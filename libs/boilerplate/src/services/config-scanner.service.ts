import { INestApplication, Injectable } from "@nestjs/common";
import { exit } from "process";

import { SCAN_CONFIG } from "../config";
import { InjectConfig } from "../decorators/inject-config.decorator";
import { BootstrapOptions, ScanConfig } from "../includes";

@Injectable()
export class ConfigScanner {
  constructor(
    @InjectConfig(SCAN_CONFIG) private readonly scanConfig: boolean,
  ) {}

  protected onRewire(
    app: INestApplication,
    options: BootstrapOptions,
  ): void | never {
    if (!this.scanConfig) {
      return;
    }
    if (this.scanConfig) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(ScanConfig(app, options?.config)));
      exit();
    }
  }
}
