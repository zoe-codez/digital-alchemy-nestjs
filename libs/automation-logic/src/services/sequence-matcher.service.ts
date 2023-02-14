import { Injectable } from "@nestjs/common";
import {
  AutoLogService,
  InjectConfig,
  ModuleScannerService,
  OnEvent,
} from "@steggy/boilerplate";
import { HA_EVENT_STATE_CHANGE, HassEventDTO } from "@steggy/home-assistant";
import { each } from "async";

import { SEQUENCE_TIMEOUT } from "../config";
import { SequenceWatchDTO } from "../contracts";
import { SequenceWatcher } from "../decorators";

type SequenceWatcher = SequenceWatchDTO & {
  callback: () => Promise<void>;
};
export class SequenceSensorEvent {
  public completed?: boolean;
  public progress: string[];
  public rejected: boolean;
  public watcher: SequenceWatcher;
}

@Injectable()
export class SequenceActivateService {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig(SEQUENCE_TIMEOUT) private readonly kunamiTimeout: number,
    private readonly scanner: ModuleScannerService,
  ) {}

  private ACTIVE_MATCHERS = new Map<string, SequenceSensorEvent[]>();
  private TIMERS = new Map<string, ReturnType<typeof setTimeout>>();
  private WATCHED_SENSORS = new Map<string, SequenceWatcher[]>();
  private readonly WATCHERS = new Map<string, unknown[]>();

  protected onApplicationBootstrap(): void {
    const providers = this.scanner.findAnnotatedMethods<SequenceWatchDTO>(
      SequenceWatcher.metadataKey,
    );
    providers.forEach(targets => {
      targets.forEach(({ context, exec, data }) => {
        this.logger.info(
          { context },
          `[%s] sequence %s`,
          data.sensor,
          data.match.map(i => `{${i}}`).join(", "),
        );
        const watcher = this.WATCHED_SENSORS.get(data.sensor) || [];
        watcher.push({
          ...data,
          callback: async () => {
            this.logger.trace({ context, match: data.match }, `[%s] trigger`);
            await exec();
          },
        });
        this.WATCHED_SENSORS.set(data.sensor, watcher);
      });
    });
  }

  @OnEvent(HA_EVENT_STATE_CHANGE)
  protected async onEntityUpdate({ data }: HassEventDTO): Promise<void> {
    if (this.WATCHERS.has(data?.entity_id)) {
      this.logger.debug(
        { attributes: data.new_state.attributes },
        `[${data.entity_id}] state change {${data.new_state.state}}`,
      );
      this.WATCHERS.get(data.entity_id).push(data.new_state.state);
      this.logger.debug(
        { entity_id: data.entity_id },
        `Blocked event from sensor being recorded`,
      );
      return;
    }
    if (!this.WATCHED_SENSORS.has(data?.entity_id)) {
      return;
    }
    this.initWatchers(data.entity_id);
    // Build up list of active matchers
    const process: SequenceSensorEvent[] = [];
    const temporary = this.ACTIVE_MATCHERS.get(data.entity_id);
    temporary.forEach(event => {
      if (event.rejected || event.completed) {
        return;
      }
      process.push(event);
    });
    const state = String(data.new_state.state);
    // Append new state to each matcher, test, then run callback
    await each(process, async item => {
      const { match, reset: immediateReset } = item.watcher;
      // Append to list of observed states
      item.progress.push(state);
      // Has appending this event invalidated the command?
      const isValid = item.progress.every(
        (item, index) => match[index] === item,
      );
      if (!isValid) {
        item.rejected = true;
        return;
      }
      // Has appending this event completed the command?
      item.completed = item.progress.length === match.length;
      if (!item.completed) {
        return;
      }
      // Run callback
      await item.watcher.callback();
      if (immediateReset === "self") {
        item.progress = [];
        item.completed = false;
        this.logger.debug({ item }, `self reset`);
      }
      if (immediateReset === "sensor") {
        this.ACTIVE_MATCHERS.delete(data.entity_id);
        clearTimeout(this.TIMERS.get(data.entity_id));
        this.TIMERS.delete(data.entity_id);
        this.logger.debug(`sensor reset {${data.entity_id}}`);
      }
    });
  }

  /**
   * Update the reset timeout
   *
   * If this entity is not part of active matchers, insert the entries to get it started
   */

  private initWatchers(entity_id: string): void {
    // Clear out old timer
    if (this.TIMERS.has(entity_id)) {
      clearTimeout(this.TIMERS.get(entity_id));
    }

    // Set up new timer
    const timer = setTimeout(() => {
      this.TIMERS.delete(entity_id);
      this.ACTIVE_MATCHERS.delete(entity_id);
      this.logger.debug({ entity_id }, `Timeout`);
    }, this.kunamiTimeout);
    this.TIMERS.set(entity_id, timer);

    // Set up active matcher if does not exist
    if (!this.ACTIVE_MATCHERS.has(entity_id)) {
      const initialEvents: SequenceSensorEvent[] = [];

      this.WATCHED_SENSORS.forEach(watchers => {
        watchers.forEach(watcher => {
          if (watcher.sensor !== entity_id) {
            return;
          }
          initialEvents.push({
            progress: [],
            rejected: false,
            watcher,
          });
        });
      });

      this.ACTIVE_MATCHERS.set(entity_id, initialEvents);
    }
  }
}
