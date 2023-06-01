/* eslint-disable spellcheck/spell-checker */
import { AutoLogService } from "@digital-alchemy/boilerplate";
import { is } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { nextTick } from "process";

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
    state: "on" | "off",
  ): void {
    const [, id] = generated_entity_split(entity_id);
    this.config.onlineProxy.attributes[id] = state;
    nextTick(async () => {
      const data = {
        attributes: this.attributes.get(entity_id),
        state,
      };
      // Double tap prevents the switch from being indecisive
      this.logger.trace({ data, name: entity_id }, `Switch state double tap`);
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
    const sensor = {
      availability_template: availability,
      friendly_name: config.name,
      icon_template: config.icon,
      turn_off: { service: this.pushEntity.commandId(entity_id, "off") },
      turn_on: { service: this.pushEntity.commandId(entity_id, "on") },
      unique_id: this.config.uniqueId(entity_id),
      value_template: this.config.doubleProxyYaml(entity_id, "on"),
    } as SwitchTemplateYaml;
    this.attributes.set(entity_id, { friendly_name: config.name });
    return sensor;
  }
}
