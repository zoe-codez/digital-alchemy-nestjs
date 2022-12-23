import { Injectable, InternalServerErrorException } from "@nestjs/common";
import {
  AutoLogService,
  CacheService,
  Cron,
  OnEvent,
} from "@steggy/boilerplate";
import { HassSocketAPIService, SOCKET_READY } from "@steggy/home-assistant";
import {
  CronExpression,
  DOWN,
  EMPTY,
  HALF,
  is,
  MINUTE,
  sleep,
  UP,
} from "@steggy/utilities";
import { CronTime } from "cron";
import dayjs from "dayjs";
import EventEmitter from "eventemitter3";
import SolarCalc from "solar-calc";
import SolarCalcType from "solar-calc/types/solarCalc";

import { LOCATION_UPDATED } from "../contracts";
import { SOLAR_EVENT } from "../decorators";

const CALC_EXPIRE = HALF * MINUTE;
export enum SolarEvents {
  astronomicalDawn = "astronomicalDawn",
  astronomicalDusk = "astronomicalDusk",
  civilDawn = "civilDawn",
  civilDusk = "civilDusk",
  dawn = "dawn",
  dusk = "dusk",
  nauticalDawn = "nauticalDawn",
  nauticalDusk = "nauticalDusk",
  nightEnd = "nightEnd",
  nightStart = "nightStart",
  solarNoon = "solarNoon",
  sunrise = "sunrise",
  sunriseEnd = "sunriseEnd",
  sunset = "sunset",
  sunsetStart = "sunsetStart",
}

const CACHE_LONG = "solar:CACHE_LONG";
const CACHE_LAT = "solar:CACHE_LAT";
let claimed = false;

@Injectable()
export class SolarCalcService {
  constructor(
    private readonly socket: HassSocketAPIService,
    private readonly eventEmitter: EventEmitter,
    private readonly logger: AutoLogService,
    private readonly cache: CacheService,
  ) {
    if (!claimed) {
      this.emit = true;
      claimed = true;
    }
  }

  public latitude = EMPTY;
  public longitude = EMPTY;
  private CALCULATOR;
  private emit = false;

  public get SOLAR_CALC(): SolarCalcType {
    if (this.CALCULATOR) {
      return this.CALCULATOR;
    }
    setTimeout(() => (this.CALCULATOR = undefined), CALC_EXPIRE);
    // @ts-expect-error Typescript is wrong this time, this works as expected
    return new SolarCalc(new Date(), this.latitude, this.longitude);
  }

  public async getCalc(referenceDate?: Date): Promise<SolarCalcType> {
    if (referenceDate) {
      // @ts-expect-error Typescript is wrong this time, this works as expected
      return new SolarCalc(referenceDate, this.latitude, this.longitude);
    }
    if (!is.number(this.latitude) || !is.number(this.longitude)) {
      this.logger.debug(`Waiting for {lat}/{long}`);
      await sleep();
      return await this.getCalc();
    }
    return this.SOLAR_CALC;
  }

  public getCalcSync(referenceDate?: Date): SolarCalcType {
    if (is.undefined(this.latitude) || is.undefined(this.longitude)) {
      throw new InternalServerErrorException("Race condition");
    }
    if (referenceDate) {
      // @ts-expect-error Typescript is wrong this time, this works as expected
      return new SolarCalc(referenceDate, this.latitude, this.longitude);
    }
    return this.SOLAR_CALC;
  }

  protected async onModuleInit(): Promise<void> {
    this.longitude = await this.cache.get(CACHE_LONG);
    this.latitude = await this.cache.get(CACHE_LAT);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  protected async updateCalculator(): Promise<void> {
    const calc = await this.getCalc();
    Object.values(SolarEvents)
      .sort((a, b) =>
        (calc[a] as Date).getTime() > (calc[b] as Date).getTime() ? UP : DOWN,
      )
      .forEach(key => this.waitForEvent(calc, key));
  }

  @OnEvent(SOCKET_READY)
  protected async updateConfig(): Promise<void> {
    const config = await this.socket.getConfig();
    this.latitude = config.latitude;
    this.longitude = config.longitude;
    await this.cache.set(CACHE_LONG, config.longitude);
    await this.cache.set(CACHE_LAT, config.latitude);
    this.eventEmitter.emit(LOCATION_UPDATED);
    this.updateCalculator();
  }

  private async waitForEvent(
    calc: SolarCalcType,
    key: `${SolarEvents}`,
  ): Promise<void> {
    if (!this.emit) {
      return;
    }
    if (dayjs().isAfter(calc[key])) {
      this.logger.debug(
        `[${key}] already fired for today {${(
          calc[key] as Date
        ).toLocaleTimeString()}}`,
      );
      return;
    }
    this.logger.info(
      `[${key}] will fire at {${(calc[key] as Date).toLocaleTimeString()}}`,
    );
    const timer = new CronTime(calc[key]);
    await sleep(timer.getTimeout());
    this.eventEmitter.emit(`solar/${key}`);
    this.eventEmitter.emit(SOLAR_EVENT, key);
    this.logger.info(`solar/${key}`);
  }
}
