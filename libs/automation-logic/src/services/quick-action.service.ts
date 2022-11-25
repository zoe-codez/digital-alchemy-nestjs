import { Injectable } from "@nestjs/common";
import { AutoLogService, GetLogContext } from "@steggy/boilerplate";
import { is, TitleCase } from "@steggy/utilities";
import EventEmitter from "eventemitter3";
import { exit } from "process";

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
  name: string;
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
    const invalid = [...QUICK_ACTIONS.entries()].filter(([provider]) => {
      const result = is.undefined(provider.constructor[SCENE_ROOM_OPTIONS]);
      return !result;
    });
    if (!is.empty(invalid)) {
      [...QUICK_ACTIONS.entries()].forEach(([instance, actions]) => {
        const options = instance.constructor[
          SCENE_ROOM_OPTIONS
        ] as iSceneRoomOptions<string, string>;
        this.roomMap.set(options.name, instance);
        actions.forEach(i => {
          const name = TitleCase(options.name);
          this.logger.info(
            `[${name}] quick action {${i.options.title || i.method}}`,
          );
          this.list.push({
            ...i,
            instance,
            name,
          });
        });
      });
      return;
    }
    this.logger.fatal(
      `{${invalid.length}} providers utilize [@QuickAction] without being Scene Rooms`,
    );
    invalid.forEach(([instance, options]) => {
      const context = GetLogContext(instance);
      options.forEach(item => {
        this.logger.error(`${context}#${item.method}`);
      });
    });
    exit();
  }
}
