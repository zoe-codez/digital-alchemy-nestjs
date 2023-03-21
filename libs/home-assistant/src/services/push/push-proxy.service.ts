import { Inject, Injectable } from "@nestjs/common";
import {
  ACTIVE_APPLICATION,
  AutoLogService,
  CacheService,
} from "@digital-alchemy/boilerplate";
import { is } from "@digital-alchemy/utilities";
import { mkdirSync, writeFileSync } from "fs";
import { dump } from "js-yaml";
import { join } from "path";

import {
  ALL_GENERATED_SERVICE_DOMAINS,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  isGeneratedDomain,
  PICK_GENERATED_ENTITY,
  PUSH_PROXY,
  PUSH_PROXY_DOMAINS,
} from "../../types";
import { PushBinarySensorService } from "./push-binary-sensor.service";
import { PushButtonService } from "./push-button.service";
import { PushSensorService } from "./push-sensor.service";
import { PushSwitchService } from "./push-switch.service";

const AUTO_INIT_DOMAINS = new Set<ALL_GENERATED_SERVICE_DOMAINS>([
  "button",
  "switch",
]);

type TemplateTypes = "binary_sensor" | "sensor" | "button";

type ProxyEntity = PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS>;

@Injectable()
export class PushProxyService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly cache: CacheService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly pushButton: PushButtonService,
    private readonly pushSensor: PushSensorService,
    private readonly pushBinarySensor: PushBinarySensorService,
    private readonly pushSwitch: PushSwitchService,
  ) {}

  public applicationYaml(packageFolder: string): string {
    const app = this.application.replaceAll("-", "_");
    const availability = `{{ is_state("binary_sensor.app_${app}_online", "on") }}`;

    return [
      // Rest commands always available, let them fail
      this.buildRest(packageFolder),
      this.buildSwitches(packageFolder, availability),
      this.buildTemplates(packageFolder, availability),
    ]
      .filter(text => !is.empty(text))
      .join(`\n`);
  }

  public async createPushProxy<ENTITY extends ProxyEntity = ProxyEntity>(
    entity: ENTITY,
  ): Promise<PUSH_PROXY<ENTITY>> {
    if (isGeneratedDomain(entity, "switch")) {
      return (await this.pushSwitch.createProxy(entity)) as PUSH_PROXY<ENTITY>;
    }
    if (isGeneratedDomain(entity, "sensor")) {
      return (await this.pushSensor.createProxy(entity)) as PUSH_PROXY<ENTITY>;
    }
    if (isGeneratedDomain(entity, "binary_sensor")) {
      return (await this.pushBinarySensor.createProxy(
        entity,
      )) as PUSH_PROXY<ENTITY>;
    }
    this.logger.error(
      { context: `@InjectPushEntity(${entity})` },
      `No proxy support for this domain`,
    );
    return undefined;
  }

  protected async onModuleInit(): Promise<void> {
    await this.autoInit();
  }

  private async autoInit(): Promise<void> {
    const { generate_entities } = this.configuration;
    if (is.empty(generate_entities)) {
      return;
    }
    await Promise.all(
      (Object.keys(generate_entities) as ALL_GENERATED_SERVICE_DOMAINS[])
        .filter(key => AUTO_INIT_DOMAINS.has(key))
        .map(async key => {
          const generate = generate_entities[key];
          if (is.empty(generate)) {
            return;
          }
          if (key === "switch") {
            // Switches
            await Promise.all(
              Object.keys(generate).map(async id => {
                const entity_id =
                  `${key}.${id}` as PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS>;
                this.logger.debug(`[%s] auto init`, entity_id);
                await this.createPushProxy(entity_id);
              }),
            );
          }
        }),
    );
  }

  /**
   * Add in any generated rest commands
   */
  private buildRest(packageFolder: string): string {
    // * all known rest commands
    const rest = {
      ...this.pushButton.restCommands(),
      ...this.pushSwitch.restCommands(),
    };
    if (is.empty(rest)) {
      return ``;
    }
    const folder = "rest_command";
    const base = join(packageFolder, folder);
    mkdirSync(base);
    // * write out individual files for each command
    Object.entries(rest).forEach(([key, command]) => {
      writeFileSync(join(base, `${key}.yaml`), dump(command), "utf8");
    });
    // * add an appropriate include
    return `rest_command: !include_dir_named ./${folder}`;
  }

  private buildSwitches(packageFolder: string, availability: string): string {
    // * all known switches
    const switches = this.pushSwitch.createSensorYaml(availability);
    if (is.empty(switches)) {
      return ``;
    }
    const folder = "switch";
    const base = join(packageFolder, folder);
    mkdirSync(base);
    // * individual files for each entity
    Object.entries(switches).forEach(([key, command]) => {
      writeFileSync(join(base, `${key}.yaml`), dump(command), "utf8");
    });
    // * switch yaml can't be grouped with normal templates
    return [
      `switch:`,
      `  - platform: "template"`,
      `    switches: !include_dir_named ./${folder}`,
    ].join(`\n`);
  }

  private buildTemplates(packageFolder: string, availability: string) {
    //  * all things that can grouped as a template
    const templates = [
      ...this.pushBinarySensor.createBinarySensorYaml(availability),
      ...this.pushSensor.createSensorYaml(availability),
      ...this.pushButton.createButtonYaml(availability),
    ] as Partial<Record<TemplateTypes, { unique_id: string }[]>>[];
    if (is.empty(templates)) {
      return undefined;
    }
    const folder = "template";
    const base = join(packageFolder, folder);
    mkdirSync(base);
    templates.forEach(data => {
      const key = Object.keys(data).find(
        // 🪄 - Either brilliant, or terrible. Let's see if it breaks somehow
        key => is.array(data[key]) && key !== "trigger",
      ) as TemplateTypes;
      if (is.empty(data[key])) {
        return;
      }
      // * flatten everything into a single folder, and write files
      // TODO: is there a better way of structuring things so it can be base/{key}/...files?
      data[key].forEach(fileData =>
        writeFileSync(
          join(base, `${fileData.unique_id}.yaml`),
          dump(data),
          "utf8",
        ),
      );
    });
    // * these come in as a flat list
    return `template: !include_dir_list ./${folder}`;
  }
}
