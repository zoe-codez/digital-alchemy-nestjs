import { Injectable } from "@nestjs/common";
import { AutoLogService, GetLogContext } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";
import EventEmitter from "eventemitter3";

import {
  iQuickAction,
  iSceneRoom,
  QUICK_ACTION,
  QUICK_ACTIONS,
} from "../decorators";

export type QuickActionListItem = iQuickAction & {
  instance?: iSceneRoom;
};

@Injectable()
export class QuickActionService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly eventEmitter: EventEmitter,
  ) {}

  public list: QuickActionListItem[] = [];

  public call(id: string, body: unknown): void {
    this.eventEmitter.emit(QUICK_ACTION(id), body);
  }

  protected onModuleInit(): void {
    if (is.empty(QUICK_ACTIONS)) {
      return;
    }
    this.logger.info(`Loading {${QUICK_ACTIONS.size}} quick actions`);
    [...QUICK_ACTIONS.entries()].forEach(([instance, actions]) => {
      actions.forEach(i => {
        this.logger.info(
          `[${GetLogContext(instance)}] quick action {${
            i.options.title || i.method
          }}`,
        );
        this.list.push({
          ...i,
          instance,
        });
      });
    });
  }
}
