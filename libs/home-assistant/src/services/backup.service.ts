import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { HALF, is, SECOND, sleep } from "@steggy/utilities";

import {
  HASSIO_WS_COMMAND,
  HomeAssistantBackup,
  SignRequestResponse,
} from "../contracts";
import { HomeAssistantFetchAPIService } from "./ha-fetch-api.service";
import { HASocketAPIService } from "./ha-socket-api.service";

interface BackupResponse {
  backing_up: boolean;
  backups: HomeAssistantBackup[];
}

@Injectable()
export class BackupService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly fetch: HomeAssistantFetchAPIService,
    private readonly socket: HASocketAPIService,
  ) {}

  public async download(slug: string, destination: string): Promise<void> {
    const result = await this.socket.sendMessage<SignRequestResponse>({
      path: `/api/backup/download/${slug}`,
      type: HASSIO_WS_COMMAND.download_backup,
    });
    if (!is.object(result) || !("path" in result)) {
      return;
    }
    await this.fetch.download(destination, {
      url: result.path,
    });
  }

  public async generate(): Promise<HomeAssistantBackup> {
    let current = await this.list();
    // const originalLength = current.backups.length;
    if (current.backing_up) {
      this.logger.warn(
        `A backup is currently in progress. Waiting for that to complete instead.`,
      );
    } else {
      this.logger.info("Initiating new backup");
      this.socket.sendMessage({
        type: HASSIO_WS_COMMAND.generate_backup,
      });
      while (current.backing_up === false) {
        this.logger.debug("... waiting");
        await sleep(HALF * SECOND);
        current = await this.list();
      }
    }
    while (current.backing_up === true) {
      this.logger.debug("... waiting");
      await sleep(HALF * SECOND);
      current = await this.list();
    }
    this.logger.info(`Backup complete`);
    return current.backups.pop();
  }

  public async list(): Promise<BackupResponse> {
    return await this.socket.sendMessage<BackupResponse>({
      type: HASSIO_WS_COMMAND.backup_info,
    });
  }

  public async remove(slug: string): Promise<void> {
    await this.socket.sendMessage(
      {
        slug,
        type: HASSIO_WS_COMMAND.remove_backup,
      },
      false,
    );
  }
}
