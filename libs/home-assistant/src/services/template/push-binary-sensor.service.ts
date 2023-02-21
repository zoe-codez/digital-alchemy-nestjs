import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";

import {
  BinarySensorTemplate,
  BinarySensorTemplateYaml,
  GET_ATTRIBUTE_TEMPLATE,
  GET_STATE_TEMPLATE,
  PICK_GENERATED_ENTITY,
  UPDATE_TRIGGER,
} from "../../types";
import { PushEntityService } from "../push-entity.service";

@Injectable()
export class PushBinarySensorService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly pushEntity: PushEntityService<"binary_sensor">,
  ) {}

  public createProxy(id: PICK_GENERATED_ENTITY<"binary_sensor">) {
    return this.pushEntity.generate(id, {
      validate: (property, value) => {
        if (property === "state") {
          return is.boolean(value);
        }
        return true;
      },
    });
  }

  public createSensorYaml(): BinarySensorTemplateYaml[] {
    const storage = this.pushEntity.domainStorage("binary_sensor");
    return [...storage.keys()].map(entity_id => {
      const { config } = storage.get(entity_id);
      const sensor = {
        auto_off: config.auto_off,
        delay_off: config.delay_off,
        delay_on: config.delay_on,
        icon: config.icon,
        name: config.name,
        state: GET_STATE_TEMPLATE,
      } as BinarySensorTemplate;
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
        trigger: UPDATE_TRIGGER("binary_sensor", entity_id),
      };
    });
  }
}
