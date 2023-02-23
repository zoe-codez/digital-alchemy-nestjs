import { Inject, Injectable } from "@nestjs/common";
import { ACTIVE_APPLICATION, AutoLogService } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";

import {
  BinarySensorTemplate,
  BinarySensorTemplateYaml,
  GET_ATTRIBUTE_TEMPLATE,
  GET_STATE_TEMPLATE,
  PICK_GENERATED_ENTITY,
  Template,
  UPDATE_TRIGGER,
} from "../../types";
import { PushEntityService, PushStorageMap } from "../push-entity.service";

@Injectable()
export class PushBinarySensorService {
  constructor(
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly logger: AutoLogService,
    private readonly pushEntity: PushEntityService<"binary_sensor">,
  ) {}
  public createBinarySensorYaml(
    availability?: Template,
    entity_id?: PICK_GENERATED_ENTITY<"binary_sensor">,
  ): BinarySensorTemplateYaml[] {
    const storage = this.pushEntity.domainStorage("binary_sensor");

    return [...(is.empty(entity_id) ? storage.keys() : [entity_id])].map(
      entity_id => {
        return this.createYaml(availability, storage, entity_id);
      },
    );
  }

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

  private createYaml(
    availability: Template,
    storage: PushStorageMap<"binary_sensor">,
    entity_id: PICK_GENERATED_ENTITY<"binary_sensor">,
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
      state: GET_STATE_TEMPLATE,
    } as BinarySensorTemplate;
    sensor.unique_id = "steggy_binary_sensor_" + is.hash(entity_id);
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
      binary_sensor: [sensor],
      trigger: UPDATE_TRIGGER("binary_sensor", entity_id),
    };
  }
}