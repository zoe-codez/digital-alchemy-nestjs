import { ACTIVE_APPLICATION } from "@digital-alchemy/boilerplate";
import { is } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";

import {
  BinarySensorTemplate,
  BinarySensorTemplateYaml,
  PICK_GENERATED_ENTITY,
  Template,
} from "../../types";
import { TalkBackService } from "../utilities";
import { PushEntityService, PushStorageMap } from "./push-entity.service";
import { PushEntityConfigService } from "./push-entity-config.service";

@Injectable()
export class PushBinarySensorService {
  constructor(
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly pushEntity: PushEntityService<"binary_sensor">,
    @Inject(forwardRef(() => PushEntityConfigService))
    private readonly config: PushEntityConfigService,
    @Inject(forwardRef(() => TalkBackService))
    private readonly talkBack: TalkBackService,
  ) {}

  public createBinarySensorYaml(
    availability?: Template,
    entity_id?: PICK_GENERATED_ENTITY<"binary_sensor">,
  ): BinarySensorTemplateYaml[] {
    const storage = this.pushEntity.domainStorage("binary_sensor");
    const keys = [...(is.empty(entity_id) ? storage.keys() : [entity_id])];
    return keys.map(entity_id => {
      return this.createYaml(availability, storage, entity_id);
    });
  }

  public createProxy(id: PICK_GENERATED_ENTITY<"binary_sensor">) {
    return this.pushEntity.generate(id, {
      validate: (property, value) => {
        if (property === "state") {
          return is.boolean(value);
        }
        return true;
      },
    });
  }

  private createYaml(
    availability: Template,
    storage: PushStorageMap<"binary_sensor">,
    entity_id: PICK_GENERATED_ENTITY<"binary_sensor">,
  ) {
    const { config } = storage.get(entity_id);
    const sensor = {
      auto_off: config.auto_off,
      availability: config.availability ?? availability,
      delay_off: config.delay_off,
      delay_on: config.delay_on,
      device_class: config.device_class,
      icon: config.icon,
      name: config.name,
      state: this.config.stateTemplate,
      unique_id: this.config.uniqueId(entity_id),
    } as BinarySensorTemplate;
    sensor.attributes = config.attributes ?? {};
    sensor.attributes.managed_by = this.application;
    return {
      binary_sensor: [sensor],
      trigger: this.talkBack.updateTriggerEvent(entity_id),
    };
  }
}
