import { Injectable } from "@nestjs/common";
import { CronJob } from "cron";

import { Cron, CronOptions } from "../../decorators";
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
  ) {}

  protected onApplicationBootstrap(): void {
    const annotated = this.scanner.findAnnotatedMethods<CronOptions>(
      Cron.metadataKey,
    );
    annotated.forEach(targets => {
      targets.forEach(({ context, data, exec }) => {
        const schedules = Array.isArray(data) ? data : [data];
        this.logger.info(
          { context },
          `cron schedules {%s items}`,
          schedules.length,
        );
        schedules.forEach(schedule => {
          this.logger.debug({ context }, ` - %s`, schedule);
          const cronJob = new CronJob(schedule, async () => {
            this.logger.trace({ context }, `Cron {%s}`, schedule);
            await exec();
          });
          cronJob.start();
        });
      });
    });
  }
}
