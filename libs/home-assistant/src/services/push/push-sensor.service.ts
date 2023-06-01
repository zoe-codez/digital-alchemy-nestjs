/* eslint-disable spellcheck/spell-checker */
import { ACTIVE_APPLICATION } from "@digital-alchemy/boilerplate";
import { is } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";

import {
  PICK_GENERATED_ENTITY,
  SensorTemplate,
  SensorTemplateYaml,
  Template,
} from "../../types";
import { TalkBackService } from "../utilities";
import { PushEntityService, PushStorageMap } from "./push-entity.service";
import { PushEntityConfigService } from "./push-entity-config.service";

@Injectable()
export class PushSensorService {
  constructor(
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly pushEntity: PushEntityService<"sensor">,
    @Inject(forwardRef(() => PushEntityConfigService))
    private readonly config: PushEntityConfigService,
    private readonly talkBack: TalkBackService,
  ) {}

  public createProxy(id: PICK_GENERATED_ENTITY<"sensor">) {
    return this.pushEntity.generate(id, {
      validate: (property, value) => {
        if (property === "state") {
          return is.string(value) || is.number(value);
        }
        return true;
      },
    });
  }

  public createSensorYaml(
    availability?: Template,
    entity_id?: PICK_GENERATED_ENTITY<"sensor">,
  ): SensorTemplateYaml[] {
    const storage = this.pushEntity.domainStorage("sensor");
    return [...(is.empty(entity_id) ? storage.keys() : [entity_id])].map(
      entity_id => {
        return this.createYaml(availability, storage, entity_id);
      },
    );
  }

  private createYaml(
    availability: Template,
    storage: PushStorageMap<"sensor">,
    entity_id: PICK_GENERATED_ENTITY<"sensor">,
  ) {
    const { config } = storage.get(entity_id);
    const sensor = {
      auto_off: config.auto_off,
      availability: config.availability ?? availability,
      delay_off: config.delay_off,
      delay_on: config.delay_on,
      device_class: config.device_class,
      icon: config.icon,
      name: config.name,
      state: this.config.stateTemplate,
      unique_id: this.config.uniqueId(entity_id),
      unit_of_measurement: config.unit_of_measurement,
    } as SensorTemplate;
    sensor.attributes = config.attributes ?? {};

    sensor.attributes.managed_by = this.application;

    return {
      sensor: [sensor],
      trigger: this.talkBack.updateTriggerEvent(entity_id),
    };
  }
}
