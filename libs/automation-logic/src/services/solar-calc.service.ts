import {
  AnnotationPassThrough,
  AutoLogService,
  CacheService,
  Cron,
  ModuleScannerService,
  OnEvent,
} from "@digital-alchemy/boilerplate";
import {
  HassFetchAPIService,
  SOCKET_READY,
} from "@digital-alchemy/home-assistant";
import {
  CronExpression,
  DOWN,
  HALF,
  is,
  MINUTE,
  SECOND,
  sleep,
  UP,
} from "@digital-alchemy/utilities";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { CronTime } from "cron";
import dayjs from "dayjs";
import EventEmitter from "eventemitter3";
import SolarCalc from "solar-calc";
import SolarCalcType from "solar-calc/types/solarCalc";

import { SolarEvent, SolarOptions } from "../decorators";
import { SOLAR_EVENT_TRIGGER, SolarEventTriggerData } from "../includes";

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

const SOLAR_CACHE = "SOLAR_CACHE";
type CacheData = {
  lat: number;
  long: number;
};
let claimed = false;
const DEFAULT_POSITION = 0;

@Injectable()
export class SolarCalcService {
  constructor(
    private readonly cache: CacheService,
    private readonly fetch: HassFetchAPIService,
    private readonly logger: AutoLogService,
    private readonly scanner: ModuleScannerService,
    private readonly event: EventEmitter,
  ) {
    if (!claimed) {
      this.emit = true;
      claimed = true;
    }
  }

  public latitude = DEFAULT_POSITION;
  public longitude = DEFAULT_POSITION;
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
    const { lat, long } = await this.cache.get<CacheData>(SOLAR_CACHE, {
      lat: DEFAULT_POSITION,
      long: DEFAULT_POSITION,
    });
    this.longitude = long;
    this.latitude = lat;
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
      await this.cache.set<CacheData>(SOLAR_CACHE, {
        lat: config.latitude,
        long: config.longitude,
      });
      this.updateCalculator();
    }, SECOND);
  }

  private initScan(): void {
    this.scanner.bindMethodDecorator<SolarOptions>(
      SolarEvent,
      ({ exec, data, context }) => {
        this.logger.info({ name: context }, `[@SolarEvent] {%s}`, data);
        this.event.emit(SOLAR_EVENT_TRIGGER, {
          context,
          event: data,
        } as SolarEventTriggerData);
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
        { name: key },
        `already fired for today {%s}`,
        (calc[key] as Date).toLocaleTimeString(),
      );
      return;
    }
    this.logger.info(
      { name: key },
      `will fire at {%s}`,
      (calc[key] as Date).toLocaleTimeString(),
    );
    const timer = new CronTime(calc[key]);
    await sleep(timer.getTimeout());
    const current = this.callbacks.get(key) ?? [];
    const wildcard = this.callbacks.get("*") ?? [];
    [current, wildcard].flat().forEach(callback => callback());
  }
}
