/* eslint-disable spellcheck/spell-checker */
import { Inject, Injectable } from "@nestjs/common";
import { AutoLogService, CacheService } from "@steggy/boilerplate";
import { eachSeries, is } from "@steggy/utilities";
import deepEqual from "deep-equal";
import { get, set } from "object-path";
import { nextTick } from "process";

import {
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
  SensorConfig,
  SensorTemplate,
} from "../types";
import { HassFetchAPIService } from "./hass-fetch-api.service";

const SET_START = ["state", "attributes"];
const UPDATE_EVENT = `steggy_sensor_update`;
const CACHE_KEY = (id: string) => `push_sensor:${id}`;

const GET_STATE = `{{ trigger.event.data.state }}`;
const GET_ATTRIBUTE = (attribute: string) =>
  `{{ trigger.event.data.attributes.${attribute} }}`;
const CONTEXT = (id: string) => `PushSensor(${id})`;

type SensorTemplateYaml = {
  sensor: SensorTemplate[];
  trigger: unknown[];
};
type StorageData = {
  attributes: Record<string, unknown>;
  config: SensorConfig;
  state: unknown;
};
const UPDATE_TRIGGER = (sensor_id: string) => [
  {
    event: UPDATE_EVENT,
    event_data: { sensor_id },
    platform: "event",
  },
];

type SensorId = PICK_GENERATED_ENTITY<"sensors">;

@Injectable()
export class PushSensorService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly cache: CacheService,
    private readonly fetch: HassFetchAPIService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration<SensorId>,
  ) {}

  private readonly STORAGE = new Map<SensorId, StorageData>();

  public createProxy(id: SensorId) {
    return new Proxy(
      {},
      {
        get: (t, property: string) => this.getLogic(id, property),
        set: (t, property: string, value: unknown) =>
          this.setLogic(id, property, value),
      },
    );
  }

  public createSensorYaml(): SensorTemplateYaml[] {
    return [...this.STORAGE.keys()].map(name => {
      const { config } = this.STORAGE.get(name);
      const sensor = {
        auto_off: config.auto_off,
        delay_off: config.delay_off,
        delay_on: config.delay_on,
        icon: config.icon,
        name: config.name,
        state: GET_STATE,
      } as SensorTemplate;
      if (config.track_history) {
        sensor.unique_id = is.hash(`sensor.${name}`);
      }
      if (config.attributes) {
        sensor.attributes = {};
        Object.keys(config.attributes).forEach(key => [
          key,
          GET_ATTRIBUTE(key),
        ]);
      }
      return {
        sensor: [sensor],
        trigger: UPDATE_TRIGGER(`sensor.${name}`),
      };
    });
  }

  protected async onModuleInit(): Promise<void> {
    const { sensors } = this.configuration.generate_entities;
    await eachSeries(Object.keys(sensors), async key => {
      await this.load(`sensor.${key}` as SensorId, sensors[key]);
    });
  }

  private async emitUpdate(id: SensorId): Promise<void> {
    const { attributes, state } = this.STORAGE.get(id);
    await this.fetch.fireEvent(UPDATE_EVENT, {
      attributes,
      sensor_id: id,
      state,
    });
  }

  private getLogic(id: SensorId, property: string) {
    const data = this.STORAGE.get(id);
    return get(data, property);
  }

  private async load(id: SensorId, config: SensorConfig): Promise<void> {
    const data = {
      attributes: {},
      config,
      state: undefined,
    } as StorageData;
    const value = await this.cache.get<StorageData>(CACHE_KEY(id));
    if (data) {
      const equal = deepEqual(value.config, config);
      if (!equal) {
        this.logger.warn({ context: CONTEXT(id) }, `Changed configuration`);
      }
      data.attributes = value.attributes;
      data.state = value.state;
    }

    this.STORAGE.set(id, data);
  }

  private setLogic(id: SensorId, property: string, value: unknown): boolean {
    const valid = SET_START.some(start => property.startsWith(start));
    if (!valid) {
      return false;
    }
    const data = this.STORAGE.get(id);
    set(data, property, value);
    nextTick(async () => await this.emitUpdate(id));
    return false;
  }
}

// type ValueTypes = "number" | "date" | "string";

// private valueType(deviceClass: string): ValueTypes {
//   switch (deviceClass) {
//     case "current":
//     case "duration":
//     case "temperature":
//     case "precipitation":
//     case "apparent_power":
//     case "water":
//     case "weight":
//     case "wind_speed":
//     case "speed":
//     case "voltage":
//     case "signal_strength":
//     case "volume":
//     case "sound_pressure":
//     case "pressure":
//     case "reactive_power":
//     case "precipitation_intensity":
//     case "power_factor":
//     case "power":
//     case "nitrogen_monoxide":
//     case "nitrous_oxide":
//     case "ozone":
//     case "pm1":
//     case "pm25":
//     case "pm10":
//     case "volatile_organic_compounds":
//     case "illuminance":
//     case "irradiance":
//     case "gas":
//     case "frequency":
//     case "energy":
//     case "distance":
//     case "monetary":
//     case "data_rate":
//     case "data_size":
//     case "atmospheric_pressure":
//     case "carbon_dioxide":
//     case "carbon_monoxide":
//     case "battery":
//     case "humidity":
//     case "moisture":
//       return "number";
//     case "timestamp":
//     case "date":
//       return "date";
//     default:
//       return "string";
//   }
// }
