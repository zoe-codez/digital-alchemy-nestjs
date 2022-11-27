import { AutoLogService, QuickScript } from "@steggy/boilerplate";
import {
  GenericEntityDTO,
  HassCallTypeGenerator,
  HassFetchAPIService,
  HomeAssistantModule,
} from "@steggy/home-assistant";
import { existsSync, writeFileSync } from "fs";
import { set } from "object-path";
import { join } from "path";
import { exit } from "process";

@QuickScript({
  application: Symbol("hass-type-generate"),
  imports: [HomeAssistantModule],
})
export class TypeGenerate {
  constructor(
    private readonly logger: AutoLogService,
    private readonly fetch: HassFetchAPIService,
    private readonly gen: HassCallTypeGenerator,
  ) {}

  public async exec(): Promise<void> {
    if (!this.fetch.valid) {
      this.logger.warn(
        `[type-generate] does not have a configuration for home assistant`,
      );
      return;
    }
    try {
      const typeInterface = await this.gen.buildTypes();
      const entities = await this.fetch.getAllEntities();
      const path = join(
        __dirname,
        "..",
        "home-assistant",
        "src",
        "dynamic.d.ts",
      );
      if (!existsSync(path)) {
        this.logger.error(`[${path}] does not exist, point to a valid target`);
        return;
      }
      const ENTITY_SETUP: Record<string, Record<string, GenericEntityDTO>> = {};
      entities.forEach(entity => set(ENTITY_SETUP, entity.entity_id, entity));
      writeFileSync(
        path,
        // This completely rebuilds the type definitions file
        // The original file is built to make this easy
        [
          `// This file is generated, and is automatically updated as a npm post install step`,
          "// To rebuild, run `npx hass-type-generate`",
          ``,
          `import { PICK_ENTITY } from "./contracts";`,
          ``,
          `export const ENTITY_SETUP = ${JSON.stringify(
            ENTITY_SETUP,
            undefined,
            "  ",
          )};`,
          "/** Use with `@InjectProxy()` */",
          typeInterface,
          "/** Use with `@InjectProxy()` */",
          "export declare const iCallService: unique symbol;",
          "",
        ].join(`\n`),
      );
      this.logger.info(`Successfully updated types`);
    } catch (error) {
      this.logger.fatal({ error });
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      exit(1);
    }
  }
}
