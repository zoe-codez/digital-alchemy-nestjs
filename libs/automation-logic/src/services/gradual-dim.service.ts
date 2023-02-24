import { Injectable } from "@nestjs/common";
import { AutoLogService, InjectConfig, OnEvent } from "@steggy/boilerplate";
import {
  EntityManagerService,
  iCallService,
  InjectCallProxy,
  PICK_ENTITY,
} from "@steggy/home-assistant";
import { is, sleep, START } from "@steggy/utilities";
import dayjs from "dayjs";
import { nextTick } from "process";
import { v4 } from "uuid";

import { GRADUAL_DIM_DEFAULT_INTERVAL } from "../config";
import {
  ANIMATION_INTERRUPT,
  GradualDimOptions,
  MAX_BRIGHTNESS,
  OFF,
  SCENE_SET_ENTITY,
} from "../types";

const UP = 1;
const DOWN = -1;

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

  private ENTITY_LOCK = new Map<PICK_ENTITY, string>();

  // eslint-disable-next-line radar/cognitive-complexity
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
      this.logger.error(`[${entity}] could not look up!`);
      return;
    }
    if (!is.number(target)) {
      this.logger.error(`[${entity_id}] no transition target!`);
      return;
    }
    if (target < OFF) {
      this.logger.warn(`[${entity_id}] invalid target brightness: ${target}`);
      target = OFF;
    }
    if (target > MAX_BRIGHTNESS) {
      this.logger.warn(`[${entity_id}] invalid target brightness: ${target}`);
      target = MAX_BRIGHTNESS;
    }
    if (dayjs().isAfter(end)) {
      this.logger.error(
        { end, target },
        `[${entity_id}] cannot gradual dim, endDate has already passed`,
      );
      return;
    }
    const { brightness = OFF } = entity.attributes as { brightness?: number };
    if (brightness === target) {
      this.logger.debug(
        `[${entity_id}] skipping dim, already at target {${target}}`,
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
      `[${entity_id}] gradual dim {${brightness}} => {${target}} ({${interval}}ms / {${steps}} steps = {${diff}}s total)`,
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
          this.logger.debug({ runId }, `[${entity_id}] gradual dim turn off`);
          await this.call.light.turn_off({
            entity_id,
          });
        } else {
          this.logger.debug(
            { runId },
            `[${entity_id}] set brightness {${target}}`,
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

  @OnEvent(ANIMATION_INTERRUPT)
  @OnEvent(SCENE_SET_ENTITY)
  protected onSceneSetEntity(entity_id: PICK_ENTITY): void {
    this.ENTITY_LOCK.delete(entity_id);
  }
}
