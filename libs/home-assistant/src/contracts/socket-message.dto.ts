import { HASSIO_WS_COMMAND, HassSocketMessageTypes } from "./constants";
import { HassEventDTO } from "./hass-state.dto";

export class AreaDTO {
  public area_id: string;
  public name: string;
}

export class EntityRegistryItem {
  public area_id: string;
  public config_entry_id: string;
  public device_id: string;
  public disabled_by: string;
  public entity_id: string;
  public icon: string;
  public name: string;
  public platform: string;
}

export class DeviceListItemDTO {
  public area_id: string;
  public config_entries: string[];
  public connections: string[][];
  public disabled_by: null;
  public entry_type: null;
  public id: string;
  public identifiers: string[];
  public manufacturer: string;
  public model: string;
  public name: string;
  public name_by_user: null;
  public sw_version: string;
  public via_device_id: null;
}

export class HassNotificationDTO {
  public created_at: string;
  public message: string;
  public notification_id: string;
  public status: "unread";
  public title: string;
}

export interface SignRequestResponse {
  path: string;
}

export class SocketMessageDTO {
  public error?: Record<string, unknown>;
  public event?: HassEventDTO;
  public id: string;
  public message?: string;
  public result?: Record<string, unknown>;
  public type: HassSocketMessageTypes;
}

export class SendSocketMessageDTO {
  public access_token?: string;
  public disabled_by?: "user";
  public domain?: string;
  public hidden_by?: "user";
  public service?: string;
  public service_data?: unknown;
  public type: HASSIO_WS_COMMAND;
}

export class UpdateEntityMessageDTO {
  public area_id?: string;
  public entity_id: string;
  public icon?: string;
  public name: string;
  public new_entity_id: string;
  public type: HASSIO_WS_COMMAND.registry_update;
}

export class FindRelatedDTO {
  public item_id: string;
  public item_type: string;
  public type: HASSIO_WS_COMMAND.search_related;
}

export class RegistryGetDTO {
  public entity_id: string;
  public type: HASSIO_WS_COMMAND.registry_get;
}

export class RenderTemplateDTO {
  public template: string;
  public timeout: number;
  public type: HASSIO_WS_COMMAND.render_template;
}

export class SubscribeTriggerDTO {
  public trigger: Record<string, unknown>;
  public type: HASSIO_WS_COMMAND.subscribe_trigger;
}

export class UnsubscribeEventsDTO {
  public subscription: number;
  public type: HASSIO_WS_COMMAND.unsubscribe_events;
}

export class SignPathDTO {
  public path: string;
  public type: HASSIO_WS_COMMAND.download_backup;
}

export class RemoveBackupDTO {
  public slug: string;
  public type: HASSIO_WS_COMMAND.remove_backup;
}

export type SOCKET_MESSAGES = { id?: number } & (
  | FindRelatedDTO
  | RegistryGetDTO
  | RemoveBackupDTO
  | RenderTemplateDTO
  | SendSocketMessageDTO
  | SignPathDTO
  | SubscribeTriggerDTO
  | UnsubscribeEventsDTO
  | UpdateEntityMessageDTO
);
