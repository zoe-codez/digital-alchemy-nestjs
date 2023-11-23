import {
  AnnotationPassThrough,
  AutoLogService,
  ModuleScannerService,
} from "@digital-alchemy/boilerplate";
import { eachSeries, is } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import EventEmitter from "eventemitter3";
import { nextTick } from "process";

import { OnHassEvent, OnHassEventOptions } from "../../decorators";
import {
  HASS_ONMESSAGE_CALLBACK,
  HassEventDTO,
  HassOnMessageCallbackData,
  SocketMessageDTO,
} from "../../types";
import { EntityManagerService } from "./entity-manager.service";

type BindingPair = [context: string, callback: AnnotationPassThrough];
const bindings = new Map<OnHassEventOptions, BindingPair>();

@Injectable()
export class EventManagerService {
  constructor(
    private readonly scanner: ModuleScannerService,
    private readonly logger: AutoLogService,
    private readonly entityManager: EntityManagerService,
    private readonly event: EventEmitter,
  ) {}

  public onMessage(message: SocketMessageDTO): void {
    if (message.event.event_type === "state_changed") {
      // This needs to explicitly happen first to ensure data availability
      this.onStateChanged(message.event);
    }
    const activate: [OnHassEventOptions, BindingPair][] = [];
    bindings.forEach((callback, options) => {
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
        const start = Date.now();
        await exec(message.event);
        this.event.emit(HASS_ONMESSAGE_CALLBACK, {
          context,
          event: data.event_type,
          time: Date.now() - start,
        } as HassOnMessageCallbackData);
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
        bindings.set(data, [context, exec]);
      },
    );
  }
}
