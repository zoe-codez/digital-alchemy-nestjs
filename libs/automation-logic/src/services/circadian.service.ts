import { Injectable } from "@nestjs/common";
import {
  AutoLogService,
  Cron,
  InjectConfig,
  OnEvent,
} from "@steggy/boilerplate";
import { CronExpression } from "@steggy/utilities";
import dayjs from "dayjs";
import EventEmitter from "eventemitter3";

import {
  CIRCADIAN_ENABLED,
  CIRCADIAN_MAX_TEMP,
  CIRCADIAN_MIN_TEMP,
} from "../config";
import { CIRCADIAN_UPDATE, LOCATION_UPDATED } from "../contracts";
import { SolarCalcService } from "./solar-calc.service";

const MIN = 0;
const MAX = 1;
/**
 * This service is responsible for managing the current temperature for circadian lighting
 *
 * The temperature can be looked up on demand, and subscribed to via an observable
 */
@Injectable()
export class CircadianService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly solarCalc: SolarCalcService,
    @InjectConfig(CIRCADIAN_MAX_TEMP)
    private readonly maxTemperature: number,
    @InjectConfig(CIRCADIAN_MIN_TEMP)
    private readonly minTemperature: number,
    @InjectConfig(CIRCADIAN_ENABLED)
    private readonly circadianEnabled: boolean,
    private readonly eventEmitter: EventEmitter,
  ) {}

  public CURRENT_LIGHT_TEMPERATURE: number;

  protected onApplicationBootstrap(): void {
    if (!this.circadianEnabled) {
      this.logger.warn(`Circadian lighting updates disabled`);
      return;
    }
    this.updateKelvin();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @OnEvent(LOCATION_UPDATED)
  protected updateKelvin(): void {
    if (!this.circadianEnabled) {
      return;
    }
    const kelvin = this.getCurrentTemperature();
    if (kelvin === this.CURRENT_LIGHT_TEMPERATURE) {
      return;
    }
    this.CURRENT_LIGHT_TEMPERATURE = kelvin;
    this.logger.debug(`Circadian temperature: {${kelvin}}k`);
    this.eventEmitter.emit(CIRCADIAN_UPDATE, kelvin);
  }

  /**
   * Returns 0 when it's dark out, increasing to 1 at solar noon
   *
   * ! The math needs work, this seems more thought out because math reasons:
   * https://github.com/claytonjn/hass-circadian_lighting/blob/master/custom_components/circadian_lighting/__init__.py#L206
   */
  private getColorOffset(): number {
    const calc = this.solarCalc.getCalcSync();
    const noon = dayjs(calc.solarNoon);
    const dusk = dayjs(calc.dusk);
    const dawn = dayjs(calc.dawn);
    const now = dayjs();

    if (now.isBefore(dawn)) {
      // After midnight, but before dawn
      return MIN;
    }
    if (now.isBefore(noon)) {
      // After dawn, but before solar noon
      return Math.abs(noon.diff(now, "s") / noon.diff(dawn, "s") - MAX);
    }
    if (now.isBefore(dusk)) {
      // Afternoon, but before dusk
      return Math.abs(noon.diff(now, "s") / noon.diff(dusk, "s") - MAX);
    }
    // Until midnight
    return MIN;
  }

  private getCurrentTemperature() {
    const offset = this.getColorOffset();
    return Math.floor(
      (this.maxTemperature - this.minTemperature) * offset +
        this.minTemperature,
    );
  }
}
