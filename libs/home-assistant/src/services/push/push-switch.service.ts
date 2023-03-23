/* eslint-disable spellcheck/spell-checker */
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import {
  ACTIVE_APPLICATION,
  AutoLogService,
} from "@digital-alchemy/boilerplate";
import { is } from "@digital-alchemy/utilities";
import { nextTick } from "process";

import { TemplateButtonCommandId } from "../../decorators";
import {
  generated_entity_split,
  PICK_GENERATED_ENTITY,
  SwitchTemplateYaml,
  Template,
} from "../../types";
import { HassFetchAPIService } from "../hass-fetch-api.service";
import { TalkBackService } from "../utilities";
import { PushEntityService, PushStorageMap } from "./push-entity.service";
import { PushEntityConfigService } from "./push-entity-config.service";

@Injectable()
export class PushSwitchService {
  constructor(
    private readonly logger: AutoLogService,
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    @Inject(forwardRef(() => PushEntityConfigService))
    private readonly config: PushEntityConfigService,
    @Inject(forwardRef(() => TalkBackService))
    private readonly talkBack: TalkBackService,
    private readonly fetch: HassFetchAPIService,
    private readonly pushEntity: PushEntityService<"switch">,
  ) {}

  public readonly switchStates = {};
  private readonly attributes = new Map<
    PICK_GENERATED_ENTITY<"switch">,
    Pick<SwitchTemplateYaml, "friendly_name">
  >();

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
    const state = action === "turn_on" ? "on" : "off";
    this.config.onlineProxy.attributes[id] = state;
    nextTick(async () => {
      const data = {
        attributes: this.attributes.get(entity_id),
        state,
      };
      // Double tap prevents the switch from being indecisive
      this.logger.trace({ data }, `[%s] switch state double tap`, entity_id);
      await this.fetch.updateEntity(entity_id, {
        attributes: this.attributes.get(entity_id),
        state,
      });
    });
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
    sensor.unique_id = "digital_alchemy_switch_" + is.hash(entity_id);
    sensor.availability_template = availability;
    this.attributes.set(entity_id, {
      // availability_template: availability,
      friendly_name: config.name,
      // icon_template: config.icon,
    });
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
