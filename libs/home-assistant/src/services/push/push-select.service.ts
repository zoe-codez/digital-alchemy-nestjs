import { ACTIVE_APPLICATION } from "@digital-alchemy/boilerplate";
import { is } from "@digital-alchemy/utilities";
import { Inject, Injectable } from "@nestjs/common";
import { Get } from "type-fest";

import { TemplateButtonCommandId } from "../../decorators";
import {
  ConfigDomainMap,
  entity_split,
  InputSelectTemplate,
  InputSelectTemplateYaml,
  PICK_GENERATED_ENTITY,
  Template,
} from "../../types";
import { PushEntityService, PushStorageMap } from "./push-entity.service";

@Injectable()
export class PushSelectService {
  constructor(
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly pushEntity: PushEntityService<"input_select">,
  ) {}

  public createProxy(id: PICK_GENERATED_ENTITY<"input_select">) {
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
    entity_id?: PICK_GENERATED_ENTITY<"input_select">,
  ): InputSelectTemplateYaml[] {
    const storage = this.pushEntity.domainStorage("input_select");
    return [...(is.empty(entity_id) ? storage.keys() : [entity_id])].map(
      entity_id => {
        return this.createYaml(availability, storage, entity_id);
      },
    );
  }

  private createYaml(
    availability: Template,
    storage: PushStorageMap<"input_select">,
    entity_id: PICK_GENERATED_ENTITY<"input_select">,
  ): InputSelectTemplateYaml {
    type config = Get<ConfigDomainMap, "input_select">;
    const { config } = storage.get(entity_id);
    const [, id] = entity_split(entity_id);
    const sensor = {
      availability: config.availability ?? availability,
      icon: config.icon,
      name: config.name,
      options: config.options,
      select_action: {
        service:
          "rest_command." +
          TemplateButtonCommandId(this.application, entity_id) +
          "_select",
      },
      state: `{{ state_attr('${this.pushEntity.onlineId}', '${id}') }}`,
      unique_id: `digital_alchemy_input_select_${id}`,
    } as InputSelectTemplate;

    // sensor.attributes.managed_by = this.application;

    return {
      select: [sensor],
    };
  }
}

// - select:
//     options: "{{ state_attr('select.383', 'options') }}"
//     select_option:
//       - service: select.select_option
//         target:
//           entity_id : select.383
//         data:
//           option: "{{ option }}"
