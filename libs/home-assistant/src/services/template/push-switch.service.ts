/* eslint-disable spellcheck/spell-checker */
import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";

import {
  generated_entity_split,
  GET_STATE_TEMPLATE,
  PICK_GENERATED_ENTITY,
  SwitchTemplateYaml,
  TALK_BACK_ACTION,
  Template,
} from "../../types";
import { PushEntityService, PushStorageMap } from "../push-entity.service";
import { TalkBackService } from "../talk-back.service";

@Injectable()
export class PushSwitchService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly talkBack: TalkBackService,
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
    this.pushEntity.proxySet(entity_id, "state", action === "turn_on");
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
    const sensor = {
      friendly_name: config.name,
      icon_template: config.icon,
    } as SwitchTemplateYaml;
    sensor.unique_id = "steggy_switch_" + is.hash(entity_id);
    sensor.availability_template = availability;
    // switches must obey the availability of the service hosting them
    sensor.value_template = GET_STATE_TEMPLATE;
    sensor.turn_on = TALK_BACK_ACTION(entity_id, "turn_on");
    sensor.turn_off = TALK_BACK_ACTION(entity_id, "turn_off");
    return sensor;
  }
}
