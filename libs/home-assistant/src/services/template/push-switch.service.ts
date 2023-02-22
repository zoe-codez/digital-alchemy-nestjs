/* eslint-disable spellcheck/spell-checker */
import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";

import {
  GET_STATE_TEMPLATE,
  PICK_GENERATED_ENTITY,
  SwitchTemplateYaml,
  TALK_BACK_ACTION,
} from "../../types";
import { PushEntityService, PushStorageMap } from "../push-entity.service";

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

  public createSensorYaml(
    entity_id?: PICK_GENERATED_ENTITY<"switch">,
  ): SwitchTemplateYaml[] {
    const storage = this.pushEntity.domainStorage("switch");

    return [...(is.empty(entity_id) ? storage.keys() : [entity_id])].map(
      entity_id => {
        return this.createYaml(storage, entity_id);
      },
    );
  }

  private createYaml(
    storage: PushStorageMap<"switch">,
    entity_id: PICK_GENERATED_ENTITY<"switch">,
  ) {
    const { config } = storage.get(entity_id);
    const sensor = {
      friendly_name: config.name,
      icon_template: config.icon,
    } as SwitchTemplateYaml;
    if (config.track_history) {
      sensor.unique_id = is.hash(entity_id);
    }
    sensor.value_template = GET_STATE_TEMPLATE;
    sensor.turn_on = TALK_BACK_ACTION(entity_id, "turn_on");
    sensor.turn_off = TALK_BACK_ACTION(entity_id, "turn_off");
    return sensor;
  }
}
