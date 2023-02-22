import { Inject, Injectable } from "@nestjs/common";
import {
  ACTIVE_APPLICATION,
  AutoLogService,
  CacheService,
} from "@steggy/boilerplate";
import { is } from "@steggy/utilities";

import {
  ALL_GENERATED_SERVICE_DOMAINS,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  isGeneratedDomain,
  PICK_GENERATED_ENTITY,
  PUSH_PROXY,
  PUSH_PROXY_DOMAINS,
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
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly pushSensor: PushSensorService,
    private readonly pushBinarySensor: PushBinarySensorService,
    private readonly pushSwitch: PushSwitchService,
  ) {}

  public applicationYaml() {
    const availability = `{{ is_state("binary_sensor.${this.application.replaceAll(
      "-",
      "_",
    )}_online", "on") }}`;
    return {
      switch: [
        {
          platform: "template",
          switches: this.pushSwitch.createSensorYaml(availability),
        },
      ],
      template: [
        ...this.pushBinarySensor.createSensorYaml(availability),
        ...this.pushSensor.createSensorYaml(availability),
      ],
    };
  }

  public async createPushProxy<
    ENTITY extends PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS> = PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS>,
  >(entity: ENTITY): Promise<PUSH_PROXY<ENTITY>> {
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
}
