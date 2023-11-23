import { Injectable } from "@nestjs/common";
import { CronJob } from "cron";
import EventEmitter from "eventemitter3";

import { Cron, CronOptions } from "../../decorators";
import {
  CRON_SCHEDULE_TRIGGERED,
  CronScheduleTriggeredData,
} from "../../types";
import { AutoLogService } from "../auto-log.service";
import { ModuleScannerService } from "./module-scanner.service";

/**
 * Schedule setup for @Cron() annotations
 */
@Injectable()
export class ScheduleExplorerService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly scanner: ModuleScannerService,
    private readonly event: EventEmitter,
  ) {}

  protected onApplicationBootstrap(): void {
    this.scanner.bindMethodDecorator<CronOptions>(
      Cron,
      ({ context, data, exec }) => {
        const schedules = [data].flat();
        this.logger.info(
          { context },
          `[@Cron] {%s schedules}`,
          schedules.length,
        );
        schedules.forEach(schedule => {
          this.logger.debug({ context }, ` - {%s}`, schedule);
          const cronJob = new CronJob(schedule, async () => {
            this.logger.trace({ context }, `cron {%s}`, schedule);
            const start = Date.now();
            await exec();
            this.event.emit(CRON_SCHEDULE_TRIGGERED, {
              context,
              schedule: data,
              time: Date.now() - start,
            } as CronScheduleTriggeredData);
          });
          cronJob.start();
        });
      },
    );
  }
}
