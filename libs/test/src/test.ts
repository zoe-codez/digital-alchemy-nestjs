import { MetadataScanner } from "@nestjs/core";
import { NO_USER_CONFIG, QuickScriptOptions } from "@steggy/boilerplate";
import { deepExtend } from "@steggy/utilities";

import { TestingModuleBuilder } from "./module-builder";

interface TestOptions {
  useFileConfig?: boolean;
}

export class Test {
  private static readonly metadataScanner = new MetadataScanner();

  public static createTestingModule(
    metadata: QuickScriptOptions,
    { useFileConfig }: TestOptions = {},
  ) {
    metadata.bootstrap.flags ??= [];
    if (!useFileConfig) {
      metadata.bootstrap.flags.push(NO_USER_CONFIG);
    }
    return new TestingModuleBuilder(this.metadataScanner, {
      ...metadata,
      bootstrap: deepExtend(
        {
          config: {
            libs: { boilerplate: { LOG_LEVEL: "debug" } },
          },
          init: false,
          nestNoopLogger: true,
          prettyLog: true,
          skipConfigLoad: true,
        },
        metadata.bootstrap,
      ),
    });
  }
}
