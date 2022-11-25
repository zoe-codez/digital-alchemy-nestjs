import { Injectable } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import {
  AutoLogService,
  GetLogContext,
  InjectConfig,
  OnEvent,
} from "@steggy/boilerplate";
import {
  EntityManagerService,
  HA_EVENT_STATE_CHANGE,
  HassEventDTO,
} from "@steggy/home-assistant";
import { is } from "@steggy/utilities";
import { each } from "async";
import { isProxy } from "util/types";

import { SEQUENCE_TIMEOUT } from "../config";
import { SequenceWatchDTO } from "../contracts";
import { SEQUENCE_WATCH } from "../decorators";

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
    private readonly entityManager: EntityManagerService,
    private readonly discovery: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  private ACTIVE_MATCHERS = new Map<string, SequenceSensorEvent[]>();
  private TIMERS = new Map<string, ReturnType<typeof setTimeout>>();
  private WATCHED_SENSORS = new Map<string, SequenceWatcher[]>();

  protected onApplicationBootstrap(): void {
    const instanceWrappers: InstanceWrapper[] = [
      ...this.discovery.getControllers(),
      ...this.discovery.getProviders(),
    ];
    instanceWrappers.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;
      if (!instance || !Object.getPrototypeOf(instance) || isProxy(instance)) {
        return;
      }
      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (key: string) => {
          const activate: SequenceWatchDTO[] = this.reflector.get(
            SEQUENCE_WATCH,
            instance[key],
          );
          if (is.empty(activate)) {
            return;
          }
          activate.forEach(activate => {
            this.logger.debug(
              `${GetLogContext(instance)}#${key} sequence [${
                activate.sensor
              }] ${activate.match.map(i => `{${i}}`).join(", ")}`,
            );
            const watcher = this.WATCHED_SENSORS.get(activate.sensor) || [];
            watcher.push({
              ...activate,
              callback: async () => {
                this.logger.info(
                  `[${activate.sensor}] trigger ${GetLogContext(
                    instance,
                  )}#${key} - ${activate.match.map(i => `{${i}}`).join(", ")} `,
                );
                await instance[key]();
              },
            });
            this.WATCHED_SENSORS.set(activate.sensor, watcher);
          });
        },
      );
    });
  }

  @OnEvent(HA_EVENT_STATE_CHANGE)
  protected async onEntityUpdate({ data }: HassEventDTO): Promise<void> {
    if (!this.WATCHED_SENSORS.has(data.entity_id)) {
      return;
    }
    if (this.entityManager.WATCHERS.has(data.entity_id)) {
      this.logger.debug(
        { entity_id: data.entity_id },
        `Blocked event from sensor being recorded`,
      );
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