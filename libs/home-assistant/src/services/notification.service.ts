import { Injectable } from "@nestjs/common";

import { HASSIO_WS_COMMAND, HassNotificationDTO } from "../contracts";
import { HASocketAPIService } from "./ha-socket-api.service";

/**
 * Use the proxy api for a more full featured experience
 */
@Injectable()
export class NotificationService {
  constructor(private readonly socket: HASocketAPIService) {}

  public async dismiss(notification_id: string): Promise<void> {
    return await this.socket.sendMessage({
      domain: "persistent_notification",
      service: "dismiss",
      service_data: { notification_id },
      type: HASSIO_WS_COMMAND.call_service,
    });
  }

  public async list(): Promise<HassNotificationDTO[]> {
    return await this.socket.sendMessage({
      type: HASSIO_WS_COMMAND.persistent_notification,
    });
  }
}
