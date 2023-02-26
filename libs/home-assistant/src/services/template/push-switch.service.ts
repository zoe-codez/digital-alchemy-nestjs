/* eslint-disable spellcheck/spell-checker */
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { ACTIVE_APPLICATION, AutoLogService } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";

import { TemplateButtonCommandId } from "../../decorators";
import {
  generated_entity_split,
  GET_STATE_TEMPLATE,
  PICK_GENERATED_ENTITY,
  SwitchTemplateYaml,
  Template,
} from "../../types";
import { PushEntityService, PushStorageMap } from "../push-entity.service";
import { PushEntityConfigService } from "../push-entity-config.service";
import { TalkBackService } from "../talk-back.service";

@Injectable()
export class PushSwitchService {
  constructor(
    private readonly logger: AutoLogService,
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    @Inject(forwardRef(() => PushEntityConfigService))
    private readonly config: PushEntityConfigService,
    private readonly talkBack: TalkBackService,
    private readonly pushEntity: PushEntityService<"switch">,
  ) {}

  public readonly switchStates = {};

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
    availability: Template,
    entity_id?: PICK_GENERATED_ENTITY<"switch">,
  ): Record<string, SwitchTemplateYaml> {
    const storage = this.pushEntity.domainStorage("switch");
    return Object.fromEntries(
      [...(is.empty(entity_id) ? storage.keys() : [entity_id])].map(
        entity_id => {
          const [, id] = generated_entity_split(entity_id);
          return [id, this.createYaml(availability, storage, entity_id)];
        },
      ),
    );
  }

  public onTalkBack(
    entity_id: PICK_GENERATED_ENTITY<"switch">,
    action: "turn_on" | "turn_off",
  ): void {
    const [, id] = generated_entity_split(entity_id);
    this.config.onlineProxy.attributes[id] =
      action === "turn_on" ? "on" : "off";
  }

  public restCommands() {
    const storage = this.pushEntity.domainStorage("switch");
    return this.talkBack.createSwitchRest(storage);
  }

  private createYaml(
    availability: Template,
    storage: PushStorageMap<"switch">,
    entity_id: PICK_GENERATED_ENTITY<"switch">,
  ) {
    const { config } = storage.get(entity_id);
    const [, id] = generated_entity_split(entity_id);
    const sensor = {
      friendly_name: config.name,
      icon_template: config.icon,
    } as SwitchTemplateYaml;
    sensor.unique_id = "steggy_switch_" + is.hash(entity_id);
    sensor.availability_template = availability;
    // switches must obey the availability of the service hosting them
    const online_id = `binary_sensor.app_${this.application.replace(
      "-",
      "_",
    )}_online` as PICK_GENERATED_ENTITY<"binary_sensor">;
    sensor.value_template = `{{ is_state_attr('${online_id}', '${id}','on') }}`;
    sensor.turn_on = {
      service:
        "rest_command." +
        TemplateButtonCommandId(this.application, entity_id) +
        "_on",
    };
    sensor.turn_off = {
      service:
        "rest_command." +
        TemplateButtonCommandId(this.application, entity_id) +
        "_off",
    };
    return sensor;
  }
}
