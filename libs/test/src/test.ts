import { MetadataScanner } from "@nestjs/core";
import { QuickScriptOptions } from "@steggy/boilerplate";
import { deepExtend } from "@steggy/utilities";

import { TestingModuleBuilder } from "./module-builder";

export class Test {
  private static readonly metadataScanner = new MetadataScanner();

  public static createTestingModule(metadata: QuickScriptOptions) {
    return new TestingModuleBuilder(this.metadataScanner, {
      ...metadata,
      bootstrap: deepExtend(
        {
          config: {
            libs: { boilerplate: { LOG_LEVEL: "debug" } },
          },
          nestNoopLogger: true,
          prettyLog: true,
          skipConfigLoad: true,
        },
        metadata.bootstrap,
      ),
    });
  }
}
