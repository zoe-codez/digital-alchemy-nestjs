import { Injectable } from "@nestjs/common";

import {
  EntityRegistryItem,
  HASSIO_WS_COMMAND,
  PICK_ENTITY,
} from "../contracts";
import { HASocketAPIService } from "./ha-socket-api.service";

@Injectable()
export class EntityRegistryService {
  constructor(private readonly socket: HASocketAPIService) {}

  public async byId(entity_id: PICK_ENTITY): Promise<EntityRegistryItem> {
    return await this.socket.sendMessage({
      entity_id,
      type: HASSIO_WS_COMMAND.registry_get,
    });
  }

  /**
   * Dev note: unclear on if this can be undone
   */
  public async disable(entity_id: PICK_ENTITY, state = true): Promise<void> {
    const current = await this.byId(entity_id);
    return await this.socket.sendMessage({
      area_id: current.area_id,
      disabled_by: state ? "user" : undefined,
      entity_id,
      hidden_by: undefined,
      icon: current?.icon,
      name: current?.name,
      new_entity_id: entity_id,
      type: HASSIO_WS_COMMAND.registry_update,
    });
  }

  /**
   * Hidden state on the lovelace ui
   */
  public async hide(entity_id: PICK_ENTITY, state = true): Promise<void> {
    const current = await this.byId(entity_id);
    return await this.socket.sendMessage({
      area_id: current.area_id,
      disabled_by: undefined,
      entity_id,
      hidden_by: state ? "user" : undefined,
      icon: current?.icon,
      name: current?.name,
      new_entity_id: entity_id,
      type: HASSIO_WS_COMMAND.registry_update,
    });
  }

  public async setArea(entity_id: PICK_ENTITY, area_id: string): Promise<void> {
    const current = await this.byId(entity_id);
    return await this.socket.sendMessage({
      area_id,
      entity_id,
      icon: current?.icon,
      name: current?.name,
      new_entity_id: entity_id,
      type: HASSIO_WS_COMMAND.registry_update,
    });
  }

  /**
   * FIXME: some sort of sane self alerting system for entity manager to know about this change
   */
  public async setEntityId(
    entity_id: PICK_ENTITY,
    new_entity_id: string,
  ): Promise<void> {
    const current = await this.byId(entity_id);
    return await this.socket.sendMessage({
      area_id: current?.area_id,
      entity_id,
      icon: current?.icon,
      name: current?.name,
      new_entity_id,
      type: HASSIO_WS_COMMAND.registry_update,
    });
  }

  public async setFriendlyName(
    entity_id: PICK_ENTITY,
    name: string,
  ): Promise<void> {
    const current = await this.byId(entity_id);
    return await this.socket.sendMessage({
      area_id: current.area_id,
      entity_id,
      icon: current?.icon,
      name,
      new_entity_id: entity_id,
      type: HASSIO_WS_COMMAND.registry_update,
    });
  }
}
