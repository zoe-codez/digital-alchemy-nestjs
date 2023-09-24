import {
  AutoLogService,
  InjectConfig,
  OnEvent,
} from "@digital-alchemy/boilerplate";
import {
  GenericEntityDTO,
  PICK_ENTITY,
  PICK_GENERATED_ENTITY,
  PUSH_PROXY,
  PushEntityService,
  PushProxyService,
} from "@digital-alchemy/home-assistant";
import { EMPTY, MINUTE, NONE } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import dayjs from "dayjs";

import {
  CIRCADIAN_ENABLED,
  CIRCADIAN_MAX_TEMP,
  CIRCADIAN_MIN_TEMP,
  CIRCADIAN_SENSOR,
} from "../config";
import { LOCATION_UPDATED } from "../includes";
import { SolarCalcService } from "./solar-calc.service";

type ColorModes = "color_temp" | "xy" | "brightness";
export type ColorLight = GenericEntityDTO<{
  brightness: number;
  color_mode: ColorModes;
  color_temp: number;
  color_temp_kelvin: number;
  entity_id: PICK_ENTITY<"light">[];
  hs_color: [h: number, s: number];
  max_mireds: number;
  min_mireds: number;
  min_temp_kelvin: number;
  rgb_color: [number, number, number];
  supported_color_modes: ColorModes[];
  supported_features: number;
  xy_color: [x: number, y: number];
}>;
const MIN = 0;
const MAX = 1;
const MIRED_CONVERSION = 1_000_000;
/**
 * This service is responsible for managing the current temperature for circadian lighting
 *
 * The temperature can be looked up on demand, and subscribed to via an observable
 */
@Injectable()
export class CircadianService<
  SENSOR extends
    PICK_GENERATED_ENTITY<"sensor"> = PICK_GENERATED_ENTITY<"sensor">,
> {
  constructor(
    private readonly logger: AutoLogService,
    private readonly solarCalc: SolarCalcService,
    @InjectConfig(CIRCADIAN_MAX_TEMP)
    private readonly maxTemperature: number,
    @InjectConfig(CIRCADIAN_MIN_TEMP)
    private readonly minTemperature: number,
    @InjectConfig(CIRCADIAN_ENABLED)
    private readonly circadianEnabled: boolean,
    @InjectConfig(CIRCADIAN_SENSOR)
    private readonly circadianSensor: SENSOR,
    private readonly pushProxy: PushProxyService,
    private readonly pushEntity: PushEntityService,
  ) {}

  public get kelvin(): number {
    return Number(this.circadianEntity.state);
  }

  public get mireds(): number {
    return Math.floor(MIRED_CONVERSION / this.kelvin);
  }

  public circadianEntity: PUSH_PROXY<SENSOR>;

  public lightInRange(entity: ColorLight): boolean {
    const min = Math.max(
      this.minTemperature,
      entity.attributes.min_temp_kelvin ?? NONE,
    );
    min;
    return false;
  }

  protected async onApplicationBootstrap() {
    if (!this.circadianEnabled) {
      this.logger.warn(`Circadian lighting updates disabled`);
      return;
    }
    this.pushEntity.insert(this.circadianSensor, {
      device_class: "temperature",
      icon: "mdi:sun-thermometer",
      name: "Light temperature",
      unit_of_measurement: "K",
    });
    this.circadianEntity = await this.pushProxy.createPushProxy(
      this.circadianSensor,
    );
    this.updateKelvin();
    setInterval(() => {
      this.updateKelvin();
    }, MINUTE);
  }

  @OnEvent(LOCATION_UPDATED)
  protected updateKelvin(): void {
    if (!this.circadianEntity) {
      return;
    }
    if (
      this.solarCalc.latitude === EMPTY &&
      this.solarCalc.longitude === EMPTY
    ) {
      this.logger.debug(`[lat]/[long] not loaded yet`);
      return;
    }
    const offset = this.getColorOffset();
    this.circadianEntity.state = Math.floor(
      (this.maxTemperature - this.minTemperature) * offset +
        this.minTemperature,
    );
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
}
