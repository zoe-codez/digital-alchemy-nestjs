/* eslint-disable spellcheck/spell-checker */
import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";

import { PICK_GENERATED_ENTITY, SwitchTemplateYaml } from "../../types";
import { PushEntityService } from "../push-entity.service";

@Injectable()
export class PushSwitchService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly pushEntity: PushEntityService<"switch">,
  ) {}

  public createProxy(id: PICK_GENERATED_ENTITY<"switch">) {
    return this.pushEntity.generate(id, {
      validate: (property, value) => {
        if (property === "state") {
          return is.boolean(value);
        }
        return true;
      },
    });
  }

  public createSensorYaml(): SwitchTemplateYaml[] {
    const storage = this.pushEntity.domainStorage("switch");
    return [...storage.keys()].map(entity_id => {
      const { config } = storage.get(entity_id);
      const sensor = {
        // auto_off: config.auto_off,
        // delay_off: config.delay_off,
        // delay_on: config.delay_on,
        // device_class: config.device_class,
        icon_template: config.icon,
        // name: config.name,
        // state: GET_STATE,
        // unit_of_measurement: config.unit_of_measurement,
      } as SwitchTemplateYaml;
      if (config.track_history) {
        sensor.unique_id = is.hash(entity_id);
      }
      // if (config.attributes) {
      //   sensor.attributes = {};
      //   Object.keys(config.attributes).forEach(key => [
      //     key,
      //     GET_ATTRIBUTE(key),
      //   ]);
      // }
      // return {
      //   sensor: [sensor],
      //   trigger: UPDATE_TRIGGER(`sensor.${name}`),
      // };
      return undefined;
    });
  }
}
