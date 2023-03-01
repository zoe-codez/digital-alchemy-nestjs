import { Injectable } from "@nestjs/common";
import {
  AnnotationPassThrough,
  AutoLogService,
  ModuleScannerService,
} from "@steggy/boilerplate";
import { eachSeries, is } from "@steggy/utilities";
import { nextTick } from "process";

import { OnHassEvent, OnHassEventOptions } from "../../decorators";
import { HassEventDTO, SocketMessageDTO } from "../../types";
import { EntityManagerService } from "./entity-manager.service";

type BindingPair = [context: string, callback: AnnotationPassThrough];

@Injectable()
export class EventManagerService {
  constructor(
    private readonly scanner: ModuleScannerService,
    private readonly logger: AutoLogService,
    private readonly entityManager: EntityManagerService,
  ) {}

  private readonly bindings = new Map<OnHassEventOptions, BindingPair>();

  public onMessage(message: SocketMessageDTO): void {
    if (message.event.event_type === "state_changed") {
      // This needs to explicitly happen first to ensure data availability
      this.onStateChanged(message.event);
    }
    const activate: [OnHassEventOptions, BindingPair][] = [];
    this.bindings.forEach((callback, options) => {
      if (options.event_type !== message.event.event_type) {
        return;
      }
      activate.push([options, callback]);
    });
    nextTick(async () => {
      await eachSeries(activate, async ([data, [context, exec]]) => {
        if (is.function(data.match)) {
          const filterMatch = data.match(message.event);
          if (!filterMatch) {
            return;
          }
        }
        this.logger.trace({ context }, `[@OnHassEvent]({%s})`, data.event_type);
        await exec(message.event);
      });
    });
  }

  protected onModuleInit(): void {
    this.scan();
  }

  private onStateChanged(event: HassEventDTO): void {
    // Always keep entity manager up to date
    // It also implements the interrupt internally
    const { new_state, old_state } = event.data;
    if (!new_state) {
      // FIXME: probably removal
      return;
    }
    this.entityManager["onEntityUpdate"](
      new_state.entity_id,
      new_state,
      old_state,
    );
  }

  private scan(): void {
    this.scanner.bindMethodDecorator<OnHassEventOptions>(
      OnHassEvent,
      ({ exec, context, data }) => {
        this.logger.info({ context }, `[@OnHassEvent]`);
        this.bindings.set(data, [context, exec]);
      },
    );
  }
}