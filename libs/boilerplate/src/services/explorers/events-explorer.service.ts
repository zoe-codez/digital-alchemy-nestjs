import { Injectable } from "@nestjs/common";
import { is } from "@steggy/utilities";
import EventEmitter from "eventemitter3";

import { OnEvent, OnEventOptions } from "../../decorators/events.decorator";
import { AutoLogService } from "../auto-log.service";
import { ModuleScannerService } from "./module-scanner.service";

/**
 * Search out all the methods that were annotated with `@OnEvent`, and set up subscriptions
 */
@Injectable()
export class EventsExplorerService {
  constructor(
    private readonly scanner: ModuleScannerService,
    private readonly eventEmitter: EventEmitter,
    private readonly logger: AutoLogService,
  ) {}

  public loadEventListeners(): void {
    const annotated = this.scanner.findAnnotatedMethods<OnEventOptions>(
      OnEvent.metadataKey,
    );
    annotated.forEach(targets => {
      targets.forEach(({ data, exec, context }) => {
        const events = is.string(data) ? [data] : data.events;
        this.logger.info(
          { context },
          `event subscribe {%s events}`,
          events.length,
        );
        events.forEach(event => {
          this.logger.debug({ context }, ` - %s`, event);
          this.eventEmitter.on(event, async (...parameters: unknown[]) => {
            this.logger.trace({ context }, `OnEvent {%s}`, event);
            await exec(parameters);
          });
        });
      });
    });
  }

  protected onApplicationBootstrap(): void {
    this.loadEventListeners();
  }

  protected onApplicationShutdown(): void {
    this.eventEmitter.removeAllListeners();
  }
}
