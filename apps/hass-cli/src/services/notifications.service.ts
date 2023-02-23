import { Injectable } from "@nestjs/common";
import {
  HASSIO_WS_COMMAND,
  HassNotificationDTO,
  HassSocketAPIService,
} from "@steggy/home-assistant";
import {
  ApplicationManagerService,
  PromptService,
  SyncLoggerService,
} from "@steggy/tty";
import { is } from "@steggy/utilities";
import chalk from "chalk";

type NotificationMenuResult = { notification: HassNotificationDTO };
type MenuResult = string | NotificationMenuResult;

@Injectable()
export class NotificationControlsService {
  constructor(
    private readonly prompt: PromptService,
    private readonly logger: SyncLoggerService,
    private readonly application: ApplicationManagerService,
    private readonly socket: HassSocketAPIService,
  ) {}

  public async exec(value?: MenuResult): Promise<void> {
    this.application.setHeader("Notifications");
    const list = await this.list();
    const action = await this.prompt.menu<MenuResult>({
      emptyMessage: chalk.yellow.inverse.bold(" No notifications "),
      keyMap: {
        escape: ["done"],
        f5: ["refresh"],
      },
      right: list.map(notification => {
        return {
          entry: [notification.title, { notification }],
          helpText: notification.message,
          type: notification.status,
        };
      }),
      rightHeader: "Select item to dismiss",
      showHeaders: true,
      value,
    });
    switch (action) {
      case "done":
        return;
      case "refresh":
        return await this.exec(value);
    }
    if (!is.object(action)) {
      return;
    }
    if ("notification" in action) {
      await this.dismiss(action.notification.notification_id);
      this.logger.info(`Dismissed`);
      await this.prompt.acknowledge();
      return await this.exec();
    }
  }

  private async dismiss(notification_id: string): Promise<void> {
    return await this.socket.sendMessage({
      domain: "persistent_notification",
      service: "dismiss",
      service_data: { notification_id },
      type: HASSIO_WS_COMMAND.call_service,
    });
  }

  private async list(): Promise<HassNotificationDTO[]> {
    return await this.socket.sendMessage({
      type: HASSIO_WS_COMMAND.persistent_notification,
    });
  }
}
