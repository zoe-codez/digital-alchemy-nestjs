import { is } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { Get } from "type-fest";

import {
  ConfigDomainMap,
  entity_split,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  InputSelectTemplate,
  InputSelectTemplateYaml,
  PICK_GENERATED_ENTITY,
  Template,
} from "../../types";
import { TalkBackService } from "../utilities";
import { PushEntityService, PushStorageMap } from "./push-entity.service";

@Injectable()
export class PushInputSelectService {
  constructor(
    private readonly pushEntity: PushEntityService<"input_select">,
    @Inject(forwardRef(() => TalkBackService))
    private readonly talkBack: TalkBackService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
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

  public restCommands() {
    const { input_select = {} } = this.configuration.generate_entities;
    const keys = Object.keys(input_select).map(
      i => `input_select.${i}` as PICK_GENERATED_ENTITY<"input_select">,
    );
    return this.talkBack.createInputSelectRest(keys);
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
        service: this.pushEntity.commandId(entity_id, "select"),
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
