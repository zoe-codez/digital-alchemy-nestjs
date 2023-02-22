import { Inject, Injectable } from "@nestjs/common";
import { AutoLogService, CacheService } from "@steggy/boilerplate";
import { TitleCase } from "@steggy/utilities";
import deepEqual from "deep-equal";
import { get, set } from "object-path";
import { nextTick } from "process";

import {
  ALL_GENERATED_SERVICE_DOMAINS,
  domain,
  generated_domain,
  GET_CONFIG,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
  StorageData,
  UPDATE_TRIGGER,
} from "../types";
import { HassFetchAPIService } from "./hass-fetch-api.service";

type ProxyOptions = {
  getter?: (property: string) => unknown;
  validate: (property: string, value: unknown) => boolean;
};
type MergeAndEmit<
  STATE extends unknown = unknown,
  ATTRIBUTES extends object = object,
> = {
  attributes?: ATTRIBUTES;
  state?: STATE;
};

const CACHE_KEY = (id: string) => `push_entity:${id}`;
type ProxyObject = object;
const LOG_CONTEXT = (entity_id: PICK_GENERATED_ENTITY) => {
  const [domain, id] = entity_id.split(".");
  const tag = "Push" + TitleCase(domain).replace(" ", "");
  return `${tag}(${id})`;
};

@Injectable()
export class PushEntityService<DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS> {
  constructor(
    private readonly logger: AutoLogService,
    private readonly fetch: HassFetchAPIService,
    private readonly cache: CacheService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration<DOMAIN>,
  ) {}

  private readonly STORAGE = new Map<
    PICK_GENERATED_ENTITY,
    StorageData<GET_CONFIG<DOMAIN>>
  >();
  private readonly proxyMap = new Map<
    PICK_GENERATED_ENTITY<DOMAIN>,
    ProxyObject
  >();

  public domainStorage(search: DOMAIN) {
    return new Map(
      [...this.STORAGE.entries()].filter(([id]) => domain(id) === search),
    );
  }

  public async emitUpdate<
    STATE extends unknown = unknown,
    ATTRIBUTES extends object = object,
  >(
    sensor_id: PICK_GENERATED_ENTITY<DOMAIN>,
    updates: MergeAndEmit<STATE, ATTRIBUTES>,
  ): Promise<void> {
    const data = this.STORAGE.get(sensor_id);
    const { attributes, state } = data;
    const domain = generated_domain(sensor_id);
    const context = LOG_CONTEXT(sensor_id);
    const key = CACHE_KEY(sensor_id);
    let dirty = false;
    // Merge state
    if ("state" in updates && state !== updates.state) {
      this.logger.trace(
        { context, from: state, to: updates.state },
        `update state`,
      );
      data.state = updates.state;
      dirty = true;
    }
    // Merge attributes
    if ("attributes" in updates) {
      Object.keys(updates.attributes).forEach(key => {
        const from = attributes[key];
        const to = updates.attributes[key];
        const matches = deepEqual(from, to);
        if (matches) {
          return;
        }
        this.logger.trace({ context, from, to }, `updating attribute`);
        dirty = true;
      });
    }
    // Refresh / replace cache data
    await this.cache.set(key, data);
    if (dirty) {
      this.STORAGE.set(sensor_id, data);
    } else {
      this.logger.trace({ context }, `no changes to flush`);
    }
    // Emit to home assistant anyways?
    await this.fetch.fireEvent(UPDATE_TRIGGER.event(domain), {
      attributes,
      sensor_id,
      state,
    });
  }

  public async generate(
    entity: PICK_GENERATED_ENTITY<DOMAIN>,
    options: ProxyOptions,
  ): Promise<ProxyObject> {
    if (this.proxyMap.has(entity)) {
      return this.proxyMap.get(entity);
    }
    const context = LOG_CONTEXT(entity);
    this.logger.debug(`[%s] generating proxy entity`, context);
    const proxy = new Proxy(
      {},
      {
        get: (t, property: string) => {
          if (options.getter) {
            return options.getter(property);
          }
          return get(this.get(entity), property);
        },
        set: (t, property: string, value) => {
          const status = options.validate(property, value);
          if (!status) {
            return false;
          }
          const update = {};
          set(update, property, value);
          nextTick(async () => await this.emitUpdate(entity, update));
          return true;
        },
      },
    );
    this.proxyMap.set(entity, proxy);
    const config = get(
      this.configuration.generate_entities,
      entity,
    ) as GET_CONFIG<DOMAIN>;
    const key = CACHE_KEY(entity);

    const data = {
      attributes: {},
      config,
      state: undefined,
    } as StorageData<GET_CONFIG<DOMAIN>>;

    const value = await this.cache.get<StorageData<GET_CONFIG<DOMAIN>>>(key);
    if (value) {
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
    this.STORAGE.set(entity, data);
    return proxy;
  }

  public get(entity: PICK_GENERATED_ENTITY<DOMAIN>) {
    return this.STORAGE.get(entity);
  }
}
