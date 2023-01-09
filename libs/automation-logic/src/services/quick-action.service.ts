import { Injectable } from "@nestjs/common";
import { AutoLogService, GetLogContext } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";
import EventEmitter from "eventemitter3";

import {
  iQuickAction,
  iSceneRoom,
  iSceneRoomOptions,
  QUICK_ACTION,
  QUICK_ACTIONS,
  SCENE_ROOM_OPTIONS,
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
  private roomMap = new Map<string, iSceneRoom>();

  public call(id: string, body: unknown): void {
    this.eventEmitter.emit(QUICK_ACTION(id), body);
  }

  protected onModuleInit(): void {
    this.load();
  }

  private load(): void {
    if (is.empty(QUICK_ACTIONS)) {
      return;
    }
    this.logger.info(`Loading {${QUICK_ACTIONS.size}} quick actions`);
    [...QUICK_ACTIONS.entries()].forEach(([instance, actions]) => {
      const options = instance.constructor[
        SCENE_ROOM_OPTIONS
      ] as iSceneRoomOptions<string, string>;
      this.roomMap.set(options.name, instance);
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
