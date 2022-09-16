import { MetadataScanner } from "@nestjs/core";
import { BootstrapOptions } from "@steggy/boilerplate";
import { deepExtend } from "@steggy/utilities";

import { TestingModuleBuilder } from "./module-builder";

export class Test {
  private static readonly metadataScanner = new MetadataScanner();

  public static createTestingModule(metadata: BootstrapOptions) {
    return new TestingModuleBuilder(this.metadataScanner, {
      nestNoopLogger: true,
      prettyLog: true,
      skipConfigLoad: true,
      ...metadata,
      config: deepExtend(
        {
          libs: {
            boilerplate: {
              LOG_LEVEL: "debug",
            },
          },
        },
        metadata.config ?? {},
      ),
    });
  }
}
