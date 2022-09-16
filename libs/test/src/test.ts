import { MetadataScanner } from "@nestjs/core";
import { QuickScriptOptions } from "@steggy/boilerplate";
import { deepExtend, is } from "@steggy/utilities";

import { TestingModuleBuilder } from "./module-builder";

export class Test {
  private static readonly metadataScanner = new MetadataScanner();

  public static createTestingModule(metadata: QuickScriptOptions) {
    metadata.bootstrap ??= {};
    metadata.bootstrap.flags ??= [];

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
          skipConfigLoad: is.undefined(metadata.application),
        },
        metadata.bootstrap,
      ),
    });
  }
}
