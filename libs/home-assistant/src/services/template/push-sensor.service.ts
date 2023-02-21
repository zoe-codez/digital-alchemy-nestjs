/* eslint-disable spellcheck/spell-checker */
import { Inject, Injectable } from "@nestjs/common";
import { AutoLogService, CacheService } from "@steggy/boilerplate";
import { eachSeries, is } from "@steggy/utilities";
import deepEqual from "deep-equal";
import { get, set } from "object-path";
import { nextTick } from "process";

import {
  GET_ATTRIBUTE_TEMPLATE,
  GET_STATE_TEMPLATE,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
  SensorConfig,
  SensorTemplate,
  SensorTemplateYaml,
  StorageData,
  UPDATE_TRIGGER,
} from "../../types";
import { HassFetchAPIService } from "../hass-fetch-api.service";

const SET_START = ["state", "attributes"];
const CACHE_KEY = (id: string) => `push_sensor:${id}`;

const CONTEXT = (id: string) => `PushSensor(${id})`;

type EntityId = PICK_GENERATED_ENTITY<"sensor">;

@Injectable()
export class PushSensorService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly cache: CacheService,
    private readonly fetch: HassFetchAPIService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration<EntityId>,
  ) {}

  private readonly PROXY_STORAGE = new Map();
  private readonly STORAGE = new Map<EntityId, StorageData<SensorConfig>>();

  public createProxy(id: EntityId) {
    if (!this.PROXY_STORAGE.has(id)) {
      this.PROXY_STORAGE.set(
        id,
        new Proxy(
          {},
          {
            get: (t, property: string) => this.getLogic(id, property),
            set: (t, property: string, value: unknown) =>
              this.setLogic(id, property, value),
          },
        ),
      );
    }
    return this.PROXY_STORAGE.get(id);
  }

  public createSensorYaml(): SensorTemplateYaml[] {
    return [...this.STORAGE.keys()].map(name => {
      const { config } = this.STORAGE.get(name);
      const sensor = {
        auto_off: config.auto_off,
        delay_off: config.delay_off,
        delay_on: config.delay_on,
        device_class: config.device_class,
        icon: config.icon,
        name: config.name,
        state: GET_STATE_TEMPLATE,
        unit_of_measurement: config.unit_of_measurement,
      } as SensorTemplate;
      if (config.track_history) {
        sensor.unique_id = is.hash(`sensor.${name}`);
      }
      if (config.attributes) {
        sensor.attributes = {};
        Object.keys(config.attributes).forEach(key => [
          key,
          GET_ATTRIBUTE_TEMPLATE(key),
        ]);
      }
      return {
        sensor: [sensor],
        trigger: UPDATE_TRIGGER("sensor", name),
      };
    });
  }

  protected async onModuleInit(): Promise<void> {
    const { sensor: sensors } = this.configuration.generate_entities;
    await eachSeries(Object.keys(sensors), async key => {
      await this.load(`sensor.${key}` as EntityId, sensors[key]);
    });
  }

  private async emitUpdate(sensor_id: EntityId): Promise<void> {
    const data = this.STORAGE.get(sensor_id);
    const { attributes, state } = data;
    await this.cache.set(CACHE_KEY(sensor_id), data);
    await this.fetch.fireEvent(UPDATE_TRIGGER.event("sensor"), {
      attributes,
      sensor_id,
      state,
    });
  }

  private getLogic(id: EntityId, property: string) {
    const data = this.STORAGE.get(id);
    return get(data, property);
  }

  private async load(id: EntityId, config: SensorConfig): Promise<void> {
    const context = CONTEXT(id);
    const key = CACHE_KEY(id);

    const data = {
      attributes: {},
      config,
      state: undefined,
    } as StorageData<SensorConfig>;
    const value = await this.cache.get<StorageData<SensorConfig>>(key);
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

  private setLogic(id: EntityId, property: string, value: unknown): boolean {
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
