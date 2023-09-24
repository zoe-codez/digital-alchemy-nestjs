import {
  AutoLogService,
  InjectConfig,
  OnEvent,
} from "@digital-alchemy/boilerplate";
import {
  EntityManagerService,
  iCallService,
  InjectCallProxy,
  PICK_ENTITY,
} from "@digital-alchemy/home-assistant";
import { is, sleep, START } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import dayjs, { ConfigType } from "dayjs";
import { nextTick } from "process";
import { v4 } from "uuid";

import { GRADUAL_DIM_DEFAULT_INTERVAL } from "../config";
import {
  ANIMATION_INTERRUPT,
  MAX_LED_BRIGHTNESS,
  OFF,
  SCENE_SET_ENTITY,
} from "../includes";

const UP = 1;
const DOWN = -1;

export interface GradualDimOptions {
  end: ConfigType;
  entity_id: PICK_ENTITY<"light">;
  kelvin?: number;
  stop: () => void;
  target: number;
}

@Injectable()
export class GradualDimService {
  constructor(
    private readonly logger: AutoLogService,
    @InjectCallProxy()
    private readonly call: iCallService,
    private readonly entityManager: EntityManagerService,
    @InjectConfig(GRADUAL_DIM_DEFAULT_INTERVAL)
    private readonly chunkSize: number,
  ) {}

  private ENTITY_LOCK = new Map<PICK_ENTITY<"light">, string>();

  // eslint-disable-next-line sonarjs/cognitive-complexity
  public async run({
    target,
    end,
    stop,
    entity_id,
    kelvin,
  }: GradualDimOptions): Promise<void> {
    const runId = v4();
    // Setup & sanity check
    const entity = this.entityManager.byId(entity_id);
    if (!entity) {
      this.logger.error(`[%s] could not look up!`, entity);
      return;
    }
    if (!is.number(target)) {
      this.logger.error(`[%s] no transition target!`, entity_id);
      return;
    }
    if (target < OFF) {
      this.logger.warn(`[%s] invalid target brightness: %s`, entity_id, target);
      target = OFF;
    }
    if (target > MAX_LED_BRIGHTNESS) {
      this.logger.warn(`[%s] invalid target brightness: %s`, entity_id, target);
      target = MAX_LED_BRIGHTNESS;
    }
    if (dayjs().isAfter(end)) {
      this.logger.error(
        { end, target },
        `[%s] cannot gradual dim, endDate has already passed`,
        entity_id,
      );
      return;
    }
    const { brightness = OFF } = entity.attributes as { brightness?: number };
    if (brightness === target) {
      this.logger.debug(
        `[%s] skipping dim, already at target {%s}`,
        entity_id,
        target,
      );
      return;
    }
    const diff = Math.abs(dayjs().diff(end, "millisecond"));
    // Total chunks (counting time only)
    const chunks = Math.ceil(diff / this.chunkSize);
    const brightnessDiff = Math.abs(brightness - target);
    // Total steps: use lesser value to reduce total update count
    const steps = chunks < brightnessDiff ? chunks : brightnessDiff;
    // Calculate sleep interval between steps based on actual expected updates to send
    const interval = diff / steps;
    const direction = target > brightness ? UP : DOWN;
    const stepSize = brightnessDiff / steps;

    if (this.ENTITY_LOCK.has(entity_id)) {
      this.logger.warn(`[${entity_id}] replacing gradual dim lock`);
    }
    this.ENTITY_LOCK.set(entity_id, runId);

    this.logger.info(
      { runId },
      `[%s] gradual dim {%s} => {%s} ({%s}ms / {%s} steps = {%s}s total)`,
      entity_id,
      brightness,
      target,
      interval,
      steps,
      diff,
    );
    // Gradual dim loop
    for (let sc = START; sc <= steps; sc++) {
      if (sc !== START) {
        await sleep(interval);
      }
      if (this.ENTITY_LOCK.get(entity_id) !== runId) {
        this.logger.info({ runId }, `Stopping run early, lock removed`);
        stop();
        return;
      }
      const target = Math.floor(brightness + direction * sc * stepSize);
      // Send the update off-thread to not throw off the sleep timer
      nextTick(async () => {
        if (target <= OFF) {
          this.logger.debug({ runId }, `[%s] gradual dim turn off`, entity_id);
          await this.call.light.turn_off({
            entity_id,
          });
        } else {
          this.logger.debug(
            { runId },
            `[%s] set brightness {%s}`,
            entity_id,
            target,
          );
          await this.call.light.turn_on({
            brightness: target,
            entity_id,
            kelvin,
          });
        }
      });
    }
  }

  @OnEvent({ events: [ANIMATION_INTERRUPT, SCENE_SET_ENTITY] })
  protected onSceneSetEntity(entity_id: PICK_ENTITY<"light">): void {
    this.ENTITY_LOCK.delete(entity_id);
  }
}
