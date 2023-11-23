import { AutoLogService } from "@digital-alchemy/boilerplate";
import { HALF, is, SECOND, sleep } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import EventEmitter from "eventemitter3";

import {
  HASS_ONBACKUP,
  HASSIO_WS_COMMAND,
  HassOnBackupData,
  HomeAssistantBackup,
  SignRequestResponse,
} from "../../types";
import { HassFetchAPIService } from "../hass-fetch-api.service";
import { HassSocketAPIService } from "../hass-socket-api.service";

interface BackupResponse {
  backing_up: boolean;
  backups: HomeAssistantBackup[];
}

@Injectable()
export class BackupService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly fetch: HassFetchAPIService,
    @Inject(forwardRef(() => HassSocketAPIService))
    private readonly socket: HassSocketAPIService,
    private readonly event: EventEmitter,
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
    let start: number;
    if (current.backing_up) {
      this.logger.warn(
        `A backup is currently in progress. Waiting for that to complete instead.`,
      );
    } else {
      start = Date.now();
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
    if (start) {
      this.event.emit(HASS_ONBACKUP, {
        time: Date.now() - start,
      } as HassOnBackupData);
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
