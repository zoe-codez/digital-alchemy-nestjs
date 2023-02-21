/* eslint-disable spellcheck/spell-checker */
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { AutoLogService, CacheService } from "@steggy/boilerplate";
import { eachSeries, is } from "@steggy/utilities";
import deepEqual from "deep-equal";
import { get, set } from "object-path";
import { nextTick } from "process";

import {
  BinarySensorConfig,
  BinarySensorTemplate,
  BinarySensorTemplateYaml,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
} from "../../types";
import { HassFetchAPIService } from "../hass-fetch-api.service";

const SET_START = ["state", "attributes"];
const UPDATE_EVENT = `steggy_binary_sensor_update`;
const CACHE_KEY = (id: string) => `push_binary_sensor:${id}`;

const GET_STATE = `{{ trigger.event.data.state }}`;
const GET_ATTRIBUTE = (attribute: string) =>
  `{{ trigger.event.data.attributes.${attribute} }}`;
const CONTEXT = (id: string) => `PushBinarySensor(${id})`;

type StorageData = {
  attributes: Record<string, unknown>;
  config: BinarySensorConfig;
  state: unknown;
};
const UPDATE_TRIGGER = (sensor_id: string) => [
  {
    event: UPDATE_EVENT,
    event_data: { sensor_id },
    platform: "event",
  },
];

type BinarySensorId = PICK_GENERATED_ENTITY<"binary_sensors">;

@Injectable()
export class PushBinarySensorService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly cache: CacheService,
    private readonly fetch: HassFetchAPIService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration<BinarySensorId>,
  ) {}

  private readonly STORAGE = new Map<BinarySensorId, StorageData>();

  public createProxy(id: BinarySensorId) {
    return new Proxy(
      {},
      {
        get: (t, property: string) => this.getLogic(id, property),
        set: (t, property: string, value: unknown) =>
          this.setLogic(id, property, value),
      },
    );
  }

  public createSensorYaml(): BinarySensorTemplateYaml[] {
    return [...this.STORAGE.keys()].map(name => {
      const { config } = this.STORAGE.get(name);
      const sensor = {
        auto_off: config.auto_off,
        delay_off: config.delay_off,
        delay_on: config.delay_on,
        icon: config.icon,
        name: config.name,
        state: GET_STATE,
      } as BinarySensorTemplate;
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
        trigger: UPDATE_TRIGGER(`binary_sensor.${name}`),
      };
    });
  }

  protected async onModuleInit(): Promise<void> {
    const { sensors } = this.configuration.generate_entities;
    await eachSeries(Object.keys(sensors), async key => {
      await this.load(`binary_sensor.${key}` as BinarySensorId, sensors[key]);
    });
  }

  private async emitUpdate(sensor_id: BinarySensorId): Promise<void> {
    const data = this.STORAGE.get(sensor_id);
    const { attributes, state } = data;
    await this.cache.set(CACHE_KEY(sensor_id), data);
    await this.fetch.fireEvent(UPDATE_EVENT, { attributes, sensor_id, state });
  }

  private getLogic(id: BinarySensorId, property: string) {
    const data = this.STORAGE.get(id);
    return get(data, property);
  }

  private async load(
    id: BinarySensorId,
    config: BinarySensorConfig,
  ): Promise<void> {
    const context = CONTEXT(id);
    const key = CACHE_KEY(id);

    const data = {
      attributes: {},
      config,
      state: undefined,
    } as StorageData;
    const value = await this.cache.get<StorageData>(key);
    if (data) {
      const equal = deepEqual(value.config, config);
      if (!equal) {
        this.logger.warn({ context }, `Changed configuration`);
      }
      data.attributes = value.attributes;
      data.state = value.state;
    } else {
      this.logger.info({ context }, `Loading`);
      await this.cache.set(key, data);
    }
    this.STORAGE.set(id, data);
  }

  private setLogic(
    id: BinarySensorId,
    property: string,
    value: unknown,
  ): boolean {
    const valid = SET_START.some(start => property.startsWith(start));
    if (!valid) {
      return false;
    }
    if (property === "state" && !is.boolean(value)) {
      throw new InternalServerErrorException(
        `Binary sensor can only accept boolean values`,
      );
    }
    const data = this.STORAGE.get(id);
    set(data, property, value);
    nextTick(async () => await this.emitUpdate(id));
    return false;
  }
}
