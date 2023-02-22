/* eslint-disable spellcheck/spell-checker */
import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";

import {
  GET_ATTRIBUTE_TEMPLATE,
  GET_STATE_TEMPLATE,
  PICK_GENERATED_ENTITY,
  SensorTemplate,
  SensorTemplateYaml,
  UPDATE_TRIGGER,
} from "../../types";
import { PushEntityService, PushStorageMap } from "../push-entity.service";

@Injectable()
export class PushSensorService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly pushEntity: PushEntityService<"sensor">,
  ) {}

  public createProxy(id: PICK_GENERATED_ENTITY<"sensor">) {
    return this.pushEntity.generate(id, {
      validate: (property, value) => {
        if (property === "state") {
          return is.boolean(value);
        }
        return true;
      },
    });
  }

  public createSensorYaml(
    entity_id?: PICK_GENERATED_ENTITY<"sensor">,
  ): SensorTemplateYaml[] {
    const storage = this.pushEntity.domainStorage("sensor");

    return [...(is.empty(entity_id) ? storage.keys() : [entity_id])].map(
      entity_id => {
        return this.createYaml(storage, entity_id);
      },
    );
  }

  private createYaml(
    storage: PushStorageMap<"sensor">,
    entity_id: PICK_GENERATED_ENTITY<"sensor">,
  ) {
    const { config } = storage.get(entity_id);
    const sensor = {
      auto_off: config.auto_off,
      delay_off: config.delay_off,
      delay_on: config.delay_on,
      device_class: config.device_class,
      icon: config.icon,
      name: config.name,
      state: GET_STATE_TEMPLATE,
      unit_of_measurement: config.unit_of_measurement,
    } as SensorTemplate;
    if (config.track_history) {
      sensor.unique_id = is.hash(entity_id);
    }
    if (config.attributes) {
      sensor.attributes = {};
      Object.keys(config.attributes).forEach(key => [
        key,
        GET_ATTRIBUTE_TEMPLATE(key),
      ]);
    }
    return {
      sensor: [sensor],
      trigger: UPDATE_TRIGGER("sensor", entity_id),
    };
  }
}
