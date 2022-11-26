import { Injectable } from "@nestjs/common";
import {
  HassNotificationDTO,
  NotificationService,
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
    private readonly notification: NotificationService,
    private readonly prompt: PromptService,
    private readonly logger: SyncLoggerService,
    private readonly application: ApplicationManagerService,
  ) {}

  public async exec(value?: MenuResult): Promise<void> {
    this.application.setHeader("Notifications");
    const list = await this.notification.list();
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
      await this.notification.dismiss(action.notification.notification_id);
      this.logger.info(`Dismissed`);
      await this.prompt.acknowledge();
      return await this.exec();
    }
  }
}
