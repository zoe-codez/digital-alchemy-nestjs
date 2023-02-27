import { Injectable, InternalServerErrorException } from "@nestjs/common";
import {
  AnnotationPassThrough,
  AutoLogService,
  CacheService,
  Cron,
  ModuleScannerService,
  OnEvent,
} from "@steggy/boilerplate";
import { HassFetchAPIService, SOCKET_READY } from "@steggy/home-assistant";
import {
  CronExpression,
  DOWN,
  EMPTY,
  HALF,
  is,
  MINUTE,
  SECOND,
  sleep,
  UP,
} from "@steggy/utilities";
import { CronTime } from "cron";
import dayjs from "dayjs";
import SolarCalc from "solar-calc";
import SolarCalcType from "solar-calc/types/solarCalc";

import { SolarEvent, SolarOptions } from "../decorators";

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
    private readonly cache: CacheService,
    private readonly fetch: HassFetchAPIService,
    private readonly logger: AutoLogService,
    private readonly scanner: ModuleScannerService,
  ) {
    if (!claimed) {
      this.emit = true;
      claimed = true;
    }
  }

  public latitude = EMPTY;
  public longitude = EMPTY;
  private CALCULATOR;
  private readonly callbacks = new Map<SolarOptions, AnnotationPassThrough[]>();
  private emit = false;

  public get astronomicalDawn() {
    return this.getCalcSync().astronomicalDawn;
  }

  public get astronomicalDusk() {
    return this.getCalcSync().astronomicalDusk;
  }

  public get civilDawn() {
    return this.getCalcSync().civilDawn;
  }

  public get civilDusk() {
    return this.getCalcSync().civilDusk;
  }

  public get dawn() {
    return this.getCalcSync().dawn;
  }

  public get dusk() {
    return this.getCalcSync().dusk;
  }

  public get goldenHourEnd() {
    return this.getCalcSync().goldenHourEnd;
  }

  public get goldenHourStart() {
    return this.getCalcSync().goldenHourStart;
  }

  public get nauticalDawn() {
    return this.getCalcSync().nauticalDawn;
  }

  public get nauticalDusk() {
    return this.getCalcSync().nauticalDusk;
  }

  public get nightEnd() {
    return this.getCalcSync().nightEnd;
  }

  public get nightStart() {
    return this.getCalcSync().nightStart;
  }

  public get solarNoon() {
    return this.getCalcSync().solarNoon;
  }

  public get sunrise() {
    return this.getCalcSync().sunrise;
  }

  public get sunriseEnd() {
    return this.getCalcSync().sunriseEnd;
  }

  public get sunset() {
    return this.getCalcSync().sunset;
  }

  public get sunsetStart() {
    return this.getCalcSync().sunsetStart;
  }

  public get SOLAR_CALC(): SolarCalcType {
    if (this.CALCULATOR) {
      return this.CALCULATOR;
    }
    setTimeout(() => (this.CALCULATOR = undefined), CALC_EXPIRE);
    // @ts-expect-error Typescript is wrong this time, this works as expected
    return new SolarCalc(new Date(), this.latitude, this.longitude);
  }

  public between(start: `${SolarEvents}`, end: `${SolarEvents}`): boolean {
    const calc = this.getCalcSync();
    const now = dayjs();
    return now.isAfter(calc[start]) && now.isBefore(calc[end]);
  }

  /**
   * Retrieve calculator, wait for lat / long (if maybe not available)
   */
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

  /**
   * Retrieve calculator, throws error if lat / long not available
   */
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
    this.longitude = await this.cache.get(CACHE_LONG, EMPTY);
    this.latitude = await this.cache.get(CACHE_LAT, EMPTY);
    this.initScan();
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
  protected updateConfig(): void {
    setTimeout(async () => {
      const config = await this.fetch.getConfig();
      this.latitude = config.latitude;
      this.longitude = config.longitude;
      await this.cache.set(CACHE_LONG, config.longitude);
      await this.cache.set(CACHE_LAT, config.latitude);
      this.updateCalculator();
    }, SECOND);
  }

  private initScan(): void {
    this.scanner.bindMethodDecorator<SolarOptions>(
      SolarEvent,
      ({ exec, data, context }) => {
        this.logger.info({ context }, `[@SolarEvent] {%s}`, data);
        const current = this.callbacks.get(data) ?? [];
        current.push(exec);
        this.callbacks.set(data, current);
      },
    );
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
        `[%s] already fired for today {%s}`,
        key,
        (calc[key] as Date).toLocaleTimeString(),
      );
      return;
    }
    this.logger.info(
      `[%s] will fire at {%s}`,
      key,
      (calc[key] as Date).toLocaleTimeString(),
    );
    const timer = new CronTime(calc[key]);
    await sleep(timer.getTimeout());
    [
      // .Specific to event, and wildcard
      ...this.callbacks.get(key),
      ...this.callbacks.get("*"),
    ].forEach(callback => callback());
  }
}
