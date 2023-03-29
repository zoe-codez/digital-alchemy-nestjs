import { LOG_LEVEL, QuickScript } from "@digital-alchemy/boilerplate";
import {
  HomeAssistantModule,
  SocketManagerService,
} from "@digital-alchemy/home-assistant";
import {
  ApplicationManagerService,
  PromptService,
  TTYModule,
} from "@digital-alchemy/tty";
import chalk from "chalk";
import { homedir } from "os";
import { join } from "path";

import { DOWNLOAD_DIR } from "../config";
import {
  BackupControlsService,
  EntityRemoverService,
  EntityService,
  NotificationControlsService,
} from "../services";

@QuickScript({
  application: "hass-cli",
  bootstrap: {
    application: {
      config: {
        libs: { boilerplate: { [LOG_LEVEL]: "error" } },
      },
    },
  },
  configuration: {
    [DOWNLOAD_DIR]: {
      default: join(homedir(), "Downloads"),
      description: "Where to download backups to",
      type: "string",
    },
  },
  imports: [HomeAssistantModule.forRoot(), TTYModule],
  providers: [
    BackupControlsService,
    EntityService,
    EntityRemoverService,
    NotificationControlsService,
  ],
})
export class HassCLI {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly entity: EntityService,
    private readonly backup: BackupControlsService,
    private readonly socket: SocketManagerService,
    private readonly notification: NotificationControlsService,
    private readonly remover: EntityRemoverService,
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
        {
          entry: ["Entity remover", "remover"],
          helpText: [
            `Batch remove entities from the Home Assistant entity registry`,
            "  " + chalk.bgRed.white.bold`!!DESTRUCTIVE!!`,
          ],
        },
      ],
      value,
    });
    switch (action) {
      case "remover":
        await this.remover.exec();
        return await this.exec(action);
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
    // this.socket.BUILD_PROXY = false;
    this.socket.SUBSCRIBE_EVENTS = false;
    await this.socket.connect();
  }
}
