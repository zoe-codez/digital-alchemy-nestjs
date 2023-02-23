import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  ACTIVE_APPLICATION,
  AnnotationPassThrough,
  AutoLogService,
  InjectConfig,
  ModuleScannerService,
} from "@steggy/boilerplate";
import { ADMIN_KEY, ADMIN_KEY_HEADER, LIB_SERVER } from "@steggy/server";
import { is } from "@steggy/utilities";
import { get } from "object-path";

import { TALK_BACK_BASE_URL } from "../../config";
import { TemplateButton, TemplateButtonCommandId } from "../../decorators";
import {
  ButtonTemplate,
  ButtonTemplateYaml,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
  Template,
} from "../../types";
import { PushEntityService } from "../push-entity.service";

@Injectable()
export class PushButtonService {
  constructor(
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly logger: AutoLogService,
    private readonly pushEntity: PushEntityService<"button">,
    private readonly scanner: ModuleScannerService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
    @InjectConfig(ADMIN_KEY, LIB_SERVER)
    private readonly adminKey: string,
    @InjectConfig(TALK_BACK_BASE_URL)
    private readonly baseUrl: string,
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
    return Object.fromEntries(
      [...this.passthrough.keys()].map(key => [
        TemplateButtonCommandId(this.application, key),
        {
          headers: is.empty(this.adminKey)
            ? {}
            : { [ADMIN_KEY_HEADER]: this.adminKey },
          method: "get",

          url: `${this.baseUrl}/talk-back/button-press/${key}`,
        },
      ]),
    );
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
    button.unique_id = "steggy_button_" + is.hash(entity_id);
    return {
      button: [button],
    };
  }

  private scan(): void {
    const providers =
      this.scanner.findAnnotatedMethods<PICK_GENERATED_ENTITY<"button">>(
        TemplateButton,
      );
    providers.forEach(targets => {
      targets.forEach(({ context, exec, data }) => {
        this.logger.info({ context }, `[@TemplateButton]({%s})`, data);
        this.passthrough.set(data, exec);
      });
    });
  }
}
