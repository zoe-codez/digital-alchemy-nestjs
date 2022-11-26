import { LOG_LEVEL, QuickScript } from "@steggy/boilerplate";
import {
  HASocketAPIService,
  HomeAssistantModule,
} from "@steggy/home-assistant";
import {
  ApplicationManagerService,
  PromptService,
  TTYModule,
} from "@steggy/tty";
import { homedir } from "os";
import { join } from "path";

import { DOWNLOAD_DIR } from "../config";
import {
  BackupControlsService,
  EntityService,
  NotificationControlsService,
} from "../services";

@QuickScript({
  application: Symbol("hass-cli"),
  bootstrap: {
    config: {
      libs: { boilerplate: { [LOG_LEVEL]: "error" } },
    },
  },
  configuration: {
    [DOWNLOAD_DIR]: {
      default: join(homedir(), "Downloads"),
      description: "Where to download backups to",
      type: "string",
    },
  },
  imports: [HomeAssistantModule, TTYModule],
  providers: [
    BackupControlsService,
    EntityService,
    NotificationControlsService,
  ],
})
export class HassCLI {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly entity: EntityService,
    private readonly backup: BackupControlsService,
    private readonly socket: HASocketAPIService,
    private readonly notification: NotificationControlsService,
  ) {}

  public async exec(value: string): Promise<void> {
    this.application.setHeader("Hass CLI");
    const action = await this.prompt.menu({
      condensed: true,
      keyMap: {
        b: {
          entry: ["backups"],
          highlight: "auto",
        },
        e: {
          entry: ["entity information", "entity_inspect"],
          highlight: "auto",
        },
        escape: ["done"],
        n: {
          entry: ["notifications"],
          highlight: "auto",
        },
      },
      right: [
        {
          entry: ["Entity Information", "entity_inspect"],
          helpText: "View the current state / attributes of an entity",
        },
        {
          entry: ["Backups", "backups"],
          helpText: "Create and manage backups for Home Assistant",
        },
        {
          entry: ["Notifications", "notifications"],
          helpText: "View and manage current notifications for home assistant",
        },
      ],
      value,
    });
    switch (action) {
      case "done":
        return;
      case "entity_inspect":
        await this.entity.exec();
        return await this.exec(action);
      case "backups":
        await this.backup.exec();
        return await this.exec(action);
      case "notifications":
        await this.notification.exec();
        return await this.exec(action);
    }
  }

  protected async onApplicationBootstrap(): Promise<void> {
    await this.socket.initConnection();
  }
}
