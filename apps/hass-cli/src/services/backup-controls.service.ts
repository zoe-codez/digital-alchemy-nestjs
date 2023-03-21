import { AutoLogService, InjectConfig } from "@digital-alchemy/boilerplate";
import {
  BackupService,
  HomeAssistantBackup,
} from "@digital-alchemy/home-assistant";
import {
  ApplicationManagerService,
  MainMenuEntry,
  PromptService,
  TextRenderingService,
} from "@digital-alchemy/tty";
import { is } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import chalk from "chalk";
import { join } from "path";
import { nextTick } from "process";

import { DOWNLOAD_DIR } from "../config";

type BackupMenuResult = { backup: HomeAssistantBackup };
type MenuResult = string | BackupMenuResult;

const createNew = (backing_up: boolean): MainMenuEntry<string> =>
  backing_up
    ? {
        entry: [chalk.red("create backup"), "create"],
      }
    : {
        entry: ["create backup", "create"],
      };

@Injectable()
export class BackupControlsService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly logger: AutoLogService,
    private readonly text: TextRenderingService,
    private readonly backup: BackupService,
    @InjectConfig(DOWNLOAD_DIR)
    private readonly download: string,
  ) {}

  public async exec(value?: MenuResult): Promise<void> {
    this.application.setHeader("Backup Controls");

    const { backups, backing_up } = await this.backup.list();
    const action = await this.prompt.menu<MenuResult>({
      headerMessage: [
        chalk`{bold Status:} {${
          backing_up ? `yellow backing up` : `green idle`
        }}`,
        chalk`{bold Last Refresh:} {green ${new Date().toLocaleString()}}`,
      ].join(`\n`),
      keyMap: {
        c: backing_up
          ? {
              ...createNew(backing_up),
            }
          : {
              ...createNew(backing_up),
              highlight: "auto",
            },
        escape: ["done"],
        f5: {
          alias: ["r"],
          entry: ["refresh"],
        },
      },
      left: backups.map(backup => {
        return {
          entry: [new Date(backup.date).toLocaleString(), { backup }],
          type: backup.name,
        } as MainMenuEntry<BackupMenuResult>;
      }),
      leftHeader: "",
      right: [
        {
          ...createNew(backing_up),
          helpText: "",
        },
      ],
      rightHeader: "Commands",
      value,
    });
    switch (action) {
      case "done":
        return;
      case "refresh":
        return await this.exec(action);
      case "create":
        if (backing_up) {
          this.logger.error("Wait for the current backup to finish");
          await this.prompt.acknowledge();
          return await this.exec(action);
        }
        nextTick(async () => {
          await this.backup.generate();
        });
        this.logger.info("Started new backup in background");
        await this.prompt.acknowledge();
        return await this.exec(action);
    }
    if (!is.object(action)) {
      return;
    }
    if ("backup" in action) {
      await this.manageBackup(action.backup);
      return await this.exec(action);
    }
  }

  private async manageBackup(backup: HomeAssistantBackup): Promise<void> {
    this.application.setHeader("Manage Backup");
    const { slug } = backup;
    const action = await this.prompt.menu({
      headerMessage: this.text.type(backup),
      keyMap: {
        d: {
          entry: ["download"],
          highlight: "auto",
        },
        escape: ["done"],
        r: {
          entry: ["remove"],
          highlight: "auto",
        },
      },
      right: [
        {
          entry: ["download"],
          helpText: chalk`{bold Download to:} {cyan ${join(
            this.download,
            `${slug}.tar`,
          )}}`,
        },
        { entry: ["remove"] },
      ],
    });

    switch (action) {
      case "done":
        return;
      case "download":
        await this.backup.download(slug, join(this.download, `${slug}.tar`));
        await this.prompt.acknowledge();
        return;
      case "remove":
        const confirm = await this.prompt.confirm({
          label: "Are you sure you want to remove this backup?",
        });
        if (!confirm) {
          return await this.manageBackup(backup);
        }
        await this.backup.remove(slug);
        this.logger.warn(`[${slug}] removed`);
        // Mostly here to ensure no race conditions happen
        // Slow down the user a tad
        await this.prompt.acknowledge();
        return;
    }
  }
}
