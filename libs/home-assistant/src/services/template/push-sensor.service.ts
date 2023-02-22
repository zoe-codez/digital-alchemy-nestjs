/* eslint-disable spellcheck/spell-checker */
import { Inject, Injectable } from "@nestjs/common";
import { ACTIVE_APPLICATION, AutoLogService } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";

import {
  GET_ATTRIBUTE_TEMPLATE,
  GET_STATE_TEMPLATE,
  PICK_GENERATED_ENTITY,
  SensorTemplate,
  SensorTemplateYaml,
  Template,
  UPDATE_TRIGGER,
} from "../../types";
import { PushEntityService, PushStorageMap } from "../push-entity.service";

@Injectable()
export class PushSensorService {
  constructor(
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly logger: AutoLogService,
    private readonly pushEntity: PushEntityService<"sensor">,
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
      availability,
      delay_off: config.delay_off,
      delay_on: config.delay_on,
      device_class: config.device_class,
      icon: config.icon,
      name: config.name,
      state: GET_STATE_TEMPLATE,
      unit_of_measurement: config.unit_of_measurement,
    } as SensorTemplate;
    sensor.unique_id = "steggy_sensor_" + is.hash(entity_id);
    sensor.attributes = config.attributes
      ? Object.fromEntries(
          Object.keys(config.attributes).map(key => [
            key,
            GET_ATTRIBUTE_TEMPLATE(key),
          ]),
        )
      : {};
    sensor.attributes.managed_by = this.application;

    return {
      sensor: [sensor],
      trigger: UPDATE_TRIGGER("sensor", entity_id),
    };
  }
}
