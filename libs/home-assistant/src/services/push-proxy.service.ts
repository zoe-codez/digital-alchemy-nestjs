import { Inject, Injectable } from "@nestjs/common";
import { AutoLogService, CacheService } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";

import {
  ALL_GENERATED_SERVICE_DOMAINS,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  isGeneratedDomain,
  PICK_GENERATED_ENTITY,
  TemplateYaml,
} from "../types";
import {
  PushBinarySensorService,
  PushSensorService,
  PushSwitchService,
} from "./template";

const AUTO_INIT_DOMAINS = new Set<ALL_GENERATED_SERVICE_DOMAINS>([
  "button",
  "switch",
]);

@Injectable()
export class PushProxyService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly cache: CacheService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
    private readonly pushSensor: PushSensorService,
    private readonly pushBinarySensor: PushBinarySensorService,
    private readonly pushSwitch: PushSwitchService,
  ) {}

  public applicationYaml() {
    return {
      switch: [
        {
          platform: "template",
          switches: this.pushSwitch.createSensorYaml(),
        },
      ],
      template: [
        ...this.pushBinarySensor.createSensorYaml(),
        ...this.pushSensor.createSensorYaml(),
      ],
    };
  }

  public createPushProxy(entity: PICK_GENERATED_ENTITY) {
    if (isGeneratedDomain(entity, "switch")) {
      return this.pushSwitch.createProxy(entity);
    }
    if (isGeneratedDomain(entity, "sensor")) {
      return this.pushSensor.createProxy(entity);
    }
    if (isGeneratedDomain(entity, "binary_sensor")) {
      return this.pushBinarySensor.createProxy(entity);
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
                const entity_id = `${key}.${id}` as PICK_GENERATED_ENTITY;
                this.logger.debug(`[%s] auto init`, entity_id);
                await this.createPushProxy(entity_id);
              }),
            );
          }
        }),
    );
  }
}
