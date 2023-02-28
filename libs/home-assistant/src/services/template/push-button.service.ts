import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  ACTIVE_APPLICATION,
  AnnotationPassThrough,
  AutoLogService,
  ModuleScannerService,
} from "@steggy/boilerplate";
import { is } from "@steggy/utilities";
import { get } from "object-path";

import { TemplateButton, TemplateButtonCommandId } from "../../decorators";
import {
  ButtonTemplate,
  ButtonTemplateYaml,
  entity_split,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
  Template,
} from "../../types";
import { TalkBackService } from "../talk-back.service";

@Injectable()
export class PushButtonService {
  constructor(
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly logger: AutoLogService,
    private readonly scanner: ModuleScannerService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
    private readonly talkBack: TalkBackService,
  ) {}

  private readonly passthrough = new Map<
    PICK_GENERATED_ENTITY<"button">,
    AnnotationPassThrough
  >();

  public announce(id: PICK_GENERATED_ENTITY<"button">): void {
    const callback = this.passthrough.get(id);
    if (!callback) {
      throw new NotFoundException();
    }
    callback();
  }

  public createButtonYaml(
    availability?: Template,
    entity_id?: PICK_GENERATED_ENTITY<"button">,
  ): ButtonTemplateYaml[] {
    return [
      ...(is.empty(entity_id) ? [...this.passthrough.keys()] : [entity_id]),
    ].map(entity_id => {
      return this.createYaml(availability, entity_id);
    });
  }

  public restCommands() {
    return this.talkBack.createButtonRest([...this.passthrough.keys()]);
  }

  protected onModuleInit(): void {
    this.scan();
  }

  private createYaml(
    availability: Template,
    entity_id: PICK_GENERATED_ENTITY<"button">,
  ): ButtonTemplateYaml {
    const config = get(this.configuration.generate_entities, entity_id);
    if (!config) {
      this.logger.error(`[%s] could not load configuration`, entity_id);
      return { button: [] };
    }
    const button = {
      availability: config.availability ?? availability,
      icon: config.icon,
      name: config.name,
      press: [
        {
          service: `rest_command.${TemplateButtonCommandId(
            this.application,
            entity_id,
          )}`,
        },
      ],
    } as ButtonTemplate;
    const [, id] = entity_split(entity_id);
    button.unique_id = "steggy_button_" + id;
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
