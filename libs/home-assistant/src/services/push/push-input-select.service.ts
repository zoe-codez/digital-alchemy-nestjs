import { is } from "@digital-alchemy/utilities";
import { forwardRef, Inject } from "@nestjs/common";
import { Get } from "type-fest";

import { CreateYamlOptions, iPushDomain, PushDomain } from "../../decorators";
import {
  ConfigDomainMap,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  InputSelectOnSelect,
  InputSelectTemplate,
  InputSelectTemplateYaml,
  PICK_GENERATED_ENTITY,
  Template,
} from "../../types";
import { PushEntityConfigService } from "../push-entity-config.service";
import { TalkBackService } from "../utilities";
import { PushEntityService, PushStorageMap } from "./push-entity.service";

@PushDomain({
  domain: "input_select",
})
export class PushInputSelectService implements iPushDomain<"input_select"> {
  constructor(
    private readonly pushEntity: PushEntityService<"input_select">,
    @Inject(forwardRef(() => TalkBackService))
    private readonly talkBack: TalkBackService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
    @Inject(forwardRef(() => PushEntityConfigService))
    private readonly config: PushEntityConfigService,
  ) {}

  public createYaml({
    entity_id,
    availability,
  }: CreateYamlOptions<"input_select">): InputSelectTemplateYaml[] {
    const storage = this.pushEntity.domainStorage("input_select");
    return [...(is.empty(entity_id) ? storage.keys() : [entity_id])].map(
      entity_id => {
        return this.createTemplateYaml(availability, storage, entity_id);
      },
    );
  }

  public onTalkBack(
    entity_id: PICK_GENERATED_ENTITY<"input_select">,
    data: InputSelectOnSelect,
  ): void {
    this.config.doubleProxy(entity_id, data.option);
  }

  public restCommands() {
    const { input_select = {} } = this.configuration.generate_entities;
    const keys = Object.keys(input_select).map(
      i => `input_select.${i}` as PICK_GENERATED_ENTITY<"input_select">,
    );
    return this.talkBack.createInputSelectRest(keys);
  }

  public async setEntityValue(
    entity: PICK_GENERATED_ENTITY<"input_select">,
    data: { state: boolean },
  ): Promise<void> {
    return await undefined;
  }

  private createTemplateYaml(
    availability: Template,
    storage: PushStorageMap<"input_select">,
    entity_id: PICK_GENERATED_ENTITY<"input_select">,
  ): InputSelectTemplateYaml {
    type config = Get<ConfigDomainMap, "input_select">;
    const { config } = storage.get(entity_id);
    const sensor = {
      availability: config.availability ?? availability,
      icon: config.icon,
      name: config.name,
      options: config.options,
      select_action: {
        service: this.pushEntity.commandId(entity_id, "select"),
      },
      state: this.config.doubleProxyYaml(entity_id),
      unique_id: this.config.uniqueId(entity_id),
    } as InputSelectTemplate;
    return {
      select: [sensor],
    };
  }
}
