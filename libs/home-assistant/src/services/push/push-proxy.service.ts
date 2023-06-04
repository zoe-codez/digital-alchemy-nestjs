import { AutoLogService } from "@digital-alchemy/boilerplate";
import { is } from "@digital-alchemy/utilities";
import {
  forwardRef,
  Inject,
  Injectable,
  NotImplementedException,
} from "@nestjs/common";
import { mkdirSync, writeFileSync } from "fs";
import { dump } from "js-yaml";
import { join } from "path";

import {
  ALL_GENERATED_SERVICE_DOMAINS,
  domain,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
} from "../../types";
import { PushBinarySensorService } from "./push-binary-sensor.service";
import { PushButtonService } from "./push-button.service";
import { PushEntityService } from "./push-entity.service";
import { PushInputSelectService } from "./push-input-select.service";
import { PushSensorService } from "./push-sensor.service";
import { PushSwitchService } from "./push-switch.service";

type GenericYaml = Partial<
  Record<ALL_GENERATED_SERVICE_DOMAINS, { unique_id: string }[]>
>;

@Injectable()
export class PushProxyService {
  constructor(
    private readonly logger: AutoLogService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
    private readonly pushButton: PushButtonService,
    private readonly pushSensor: PushSensorService,
    private readonly pushInputSelect: PushInputSelectService,
    private readonly pushEntity: PushEntityService,
    @Inject(forwardRef(() => PushBinarySensorService))
    private readonly pushBinarySensor: PushBinarySensorService,
    private readonly pushSwitch: PushSwitchService,
  ) {}

  public applicationYaml(packageFolder: string): string {
    const availability = `{{ is_state("${this.pushEntity.onlineId}", "on") }}`;

    return [
      // Rest commands always available, let them fail
      this.buildRest(packageFolder),
      this.buildSwitches(packageFolder, availability),
      this.buildTemplates(packageFolder, availability),
    ]
      .filter(text => !is.empty(text))
      .join(`\n`);
  }

  public async setEntityValue(
    entity: PICK_GENERATED_ENTITY<"binary_sensor">,
    data: { state: boolean },
  ): Promise<void>;
  public async setEntityValue(
    entity: PICK_GENERATED_ENTITY<"switch">,
    data: { state: boolean },
  ): Promise<void>;
  public async setEntityValue<
    STATE extends string = string,
    ATTRIBUTES extends object = object,
  >(
    entity: PICK_GENERATED_ENTITY<"sensor">,
    data: {
      attributes?: ATTRIBUTES;
      state?: STATE;
    },
  ): Promise<void>;
  public async setEntityValue(
    entity: PICK_GENERATED_ENTITY<"input_select">,
    data: { state: boolean },
  ): Promise<void>;
  public async setEntityValue(entity, data): Promise<void> {
    switch (domain(entity)) {
      case "switch":
        return await this.pushSwitch.setEntityValue(entity, data);
      case "sensor":
        return await this.pushSensor.setEntityValue(entity, data);
      case "binary_sensor":
        return await this.pushBinarySensor.setEntityValue(entity, data);
      case "input_select":
        return await this.pushInputSelect.setEntityValue(entity, data);
    }
    throw new NotImplementedException();
  }

  /**
   * Add in any generated rest commands
   */
  private buildRest(packageFolder: string): string {
    // * all known rest commands
    const rest = {
      ...this.pushInputSelect.restCommands(),
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
      ...this.pushBinarySensor.createYaml(availability),
      ...this.pushButton.createYaml(availability),
      ...this.pushInputSelect.createYaml(availability),
      ...this.pushSensor.createYaml(availability),
    ] as GenericYaml[];

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
      ) as ALL_GENERATED_SERVICE_DOMAINS;
      if (is.empty(data[key])) {
        return;
      }
      // * flatten everything into a single folder, and write files
      // TODO: is there a better way of structuring things so it can be base/{key}/...files?
      data[key].forEach(fileData => {
        writeFileSync(
          join(base, `${fileData.unique_id}.yaml`),
          dump(data),
          "utf8",
        );
      });
    });
    // * these come in as a flat list
    return `template: !include_dir_list ./${folder}`;
  }
}
