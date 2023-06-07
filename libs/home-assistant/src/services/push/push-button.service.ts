import {
  AnnotationPassThrough,
  AutoLogService,
  ModuleScannerService,
} from "@digital-alchemy/boilerplate";
import { is } from "@digital-alchemy/utilities";
import { forwardRef, Inject, NotFoundException } from "@nestjs/common";
import { get } from "object-path";

import { PushDomain, TemplateButton } from "../../decorators";
import {
  ButtonTemplate,
  ButtonTemplateYaml,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
  Template,
} from "../../types";
import { PushEntityConfigService } from "../push-entity-config.service";
import { TalkBackService } from "../utilities";
import { PushEntityService } from "./push-entity.service";

@PushDomain({
  domain: "button",
})
export class PushButtonService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly scanner: ModuleScannerService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
    @Inject(forwardRef(() => TalkBackService))
    private readonly talkBack: TalkBackService,
    private readonly pushEntity: PushEntityService,
    @Inject(forwardRef(() => PushEntityConfigService))
    private readonly config: PushEntityConfigService,
  ) {}

  private readonly passthrough = new Map<
    PICK_GENERATED_ENTITY<"button">,
    AnnotationPassThrough
  >();

  private get restKeys() {
    const { button = {} } = this.configuration.generate_entities;
    const withTarget = Object.keys(button)
      .filter(key => is.object(button[key].target))
      .map(i => `button.${i}` as PICK_GENERATED_ENTITY<"button">);
    // ? de-duplicate
    return is.unique([...this.passthrough.keys(), ...withTarget]);
  }
  public createYaml(
    availability?: Template,
    entity_id?: PICK_GENERATED_ENTITY<"button">,
  ): ButtonTemplateYaml[] {
    const ids = is.empty(entity_id) ? this.restKeys : [entity_id];
    return ids.map(entity_id =>
      this.createTemplateYaml(availability, entity_id),
    );
  }

  public onTalkBack(id: PICK_GENERATED_ENTITY<"button">): void {
    const callback = this.passthrough.get(id);
    if (!callback) {
      throw new NotFoundException();
    }
    callback();
  }

  public restCommands() {
    return this.talkBack.createButtonRest(this.restKeys);
  }

  protected onModuleInit(): void {
    this.scan();
  }

  private createTemplateYaml(
    availability: Template,
    entity_id: PICK_GENERATED_ENTITY<"button">,
  ): ButtonTemplateYaml {
    const config = get(this.configuration.generate_entities, entity_id);
    if (!config) {
      this.logger.error({ name: entity_id }, `could not load configuration`);
      return { button: [] };
    }
    const button = {
      availability: config.availability ?? availability,
      icon: config.icon,
      name: config.name,
      press: [{ service: this.pushEntity.commandId(entity_id) }],
      unique_id: this.config.uniqueId(entity_id),
    } as ButtonTemplate;
    return {
      button: [button],
    };
  }

  private scan(): void {
    this.scanner.bindMethodDecorator<PICK_GENERATED_ENTITY<"button">>(
      TemplateButton,
      ({ context, exec, data }) => {
        this.logger.info({ context }, `[@TemplateButton]({%s})`, data);
        this.passthrough.set(data, exec);
      },
    );
  }
}
