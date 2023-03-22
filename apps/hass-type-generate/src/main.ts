import {
  AutoLogService,
  InjectConfig,
  QuickScript,
} from "@digital-alchemy/boilerplate";
import {
  GenericEntityDTO,
  HassCallTypeGenerator,
  HassDigitalAlchemySerializeState,
  HassFetchAPIService,
  HOME_ASSISTANT_PACKAGE_FOLDER,
  HomeAssistantModule,
  HomeAssistantModuleConfiguration,
  LIB_HOME_ASSISTANT,
  PushCallService,
  SERIALIZE,
  VERIFICATION_FILE,
} from "@digital-alchemy/home-assistant";
import JSON from "comment-json";
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { set } from "object-path";
import { join } from "path";
import { exit } from "process";

const IT_BROKE = 1;

@QuickScript({
  PERSISTENT: false,
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
      description: "Alternate file to write to",
      type: "string",
    })
    private readonly targetFile: string,
    @InjectConfig(HOME_ASSISTANT_PACKAGE_FOLDER, LIB_HOME_ASSISTANT)
    private readonly packageFolder: string,
    @InjectConfig(VERIFICATION_FILE, LIB_HOME_ASSISTANT)
    private readonly verificationFile: string,
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
      this.findExtraTypes();
    } catch (error) {
      this.logger.fatal({ error });
      exit(IT_BROKE);
    }
  }

  private findExtraTypes(): void {
    if (!lstatSync(this.packageFolder).isDirectory()) {
      this.logger.warn(
        `[%s] is not a folder, cannot scan for extra types`,
        this.packageFolder,
      );
      return;
    }
    const list = readdirSync(this.packageFolder);
    list.forEach(item => {
      const base = join(this.packageFolder, item);
      if (!lstatSync(base).isDirectory()) {
        return;
      }
      if (!existsSync(join(base, this.verificationFile))) {
        this.logger.warn(
          { base },
          `Cannot find verification file {%s}`,
          this.verificationFile,
        );
        return;
      }
      const data = SERIALIZE.unserialize(
        readFileSync(join(base, this.verificationFile), "utf8"),
        HassDigitalAlchemySerializeState,
      );
      if (!data) {
        this.logger.error(`Failed data casting`);
        return;
      }
      data.plugins.forEach(item => {
        const [, data] = item.storage;
        this.logger.info(
          { file: data.target },
          `[%s] loading plugin`,
          item.name,
        );
        writeFileSync(data.target, data.typesData, "utf8");
      });
    });
  }
}
