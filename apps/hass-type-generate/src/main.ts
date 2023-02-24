import { AutoLogService, InjectConfig, QuickScript } from "@steggy/boilerplate";
import {
  GenericEntityDTO,
  HassCallTypeGenerator,
  HassFetchAPIService,
  HomeAssistantModule,
  HomeAssistantModuleConfiguration,
  PushCallService,
} from "@steggy/home-assistant";
import JSON from "comment-json";
import { existsSync, writeFileSync } from "fs";
import { set } from "object-path";
import { join } from "path";
import { cwd, exit } from "process";

const IT_BROKE = 1;

@QuickScript({
  application: "hass-type-generate",
  imports: [HomeAssistantModule.forRoot()],
})
export class TypeGenerate {
  constructor(
    private readonly logger: AutoLogService,
    private readonly fetch: HassFetchAPIService,
    private readonly gen: HassCallTypeGenerator,
    private readonly push: PushCallService,
    @InjectConfig("TARGET_FILE", {
      default: join(cwd(), "example.d.ts"),
      description: "Alternate file to write to",
      type: "string",
    })
    private readonly targetFile: string,
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
      const push = await this.push.buildTypes();
      const moduleSetup = JSON.stringify(
        {
          generate_entities: push,
        } as HomeAssistantModuleConfiguration,
        undefined,
        "  ",
      );
      const path =
        this.targetFile ||
        join(__dirname, "..", "home-assistant", "src", "dynamic.d.ts");
      if (!existsSync(path)) {
        this.logger.error(`[${path}] does not exist, point to a valid target`);
        return;
      }
      const ENTITY_SETUP: Record<string, Record<string, GenericEntityDTO>> = {};
      entities.forEach(entity => set(ENTITY_SETUP, entity.entity_id, entity));
      const entitySetup = JSON.stringify(ENTITY_SETUP, undefined, "  ");
      writeFileSync(
        path,
        // This completely rebuilds the type definitions file
        // The general idea should be kept in sync with the base version
        [
          `// This file is generated, and is automatically updated as a npm post install step`,
          "// To rebuild, run `npx hass-type-generate`",
          ``,
          `import { PICK_ENTITY } from "./contracts";`,
          ``,
          `export const ENTITY_SETUP = ${entitySetup};`,
          `export const MODULE_SETUP = ${moduleSetup};`,
          "/** Use with `@InjectCallProxy()` */",
          typeInterface,
          "/** Use with `@InjectCallProxy()` */",
          "export declare const iCallService: unique symbol;",
          "",
        ].join(`\n`),
      );
      this.logger.info(`Successfully updated types at path {${path}}`);
    } catch (error) {
      this.logger.fatal({ error });
      exit(IT_BROKE);
    }
  }
}
