import { MetadataScanner } from "@nestjs/core";
import { BootstrapOptions, QuickScriptOptions } from "@steggy/boilerplate";
import { deepExtend, is } from "@steggy/utilities";
import { createServer } from "http";

import { TestingModuleBuilder } from "./module-builder";

export class Test {
  private static readonly metadataScanner = new MetadataScanner();

  public static createTestingModule(metadata: QuickScriptOptions) {
    metadata.bootstrap ??= {};

    return new TestingModuleBuilder(this.metadataScanner, {
      ...metadata,
      bootstrap: deepExtend<BootstrapOptions, BootstrapOptions>(
        {
          application: {
            config: {
              libs: { boilerplate: { LOG_LEVEL: "silent" } },
            },
            skipConfigLoad: is.undefined(metadata.application),
          },
          lifecycle: {
            init: false,
          },
          logging: {
            nestNoopLogger: true,
            prettyLog: true,
          },
        },
        metadata.bootstrap,
      ),
    });
  }

  public static async getFreePort(): Promise<number> {
    return new Promise(done => {
      const server = createServer();
      server.listen(undefined, () => {
        const address = server.address();
        if (is.string(address)) {
          return;
        }
        server.close(() => done(address.port));
      });
    });
  }
}
