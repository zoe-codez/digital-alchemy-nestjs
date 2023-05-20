import { AutoLogService, CacheService } from "@digital-alchemy/boilerplate";
import { is, TitleCase } from "@digital-alchemy/utilities";
import { Inject, Injectable } from "@nestjs/common";
import { get, set } from "object-path";
import { nextTick } from "process";

import {
  ALL_GENERATED_SERVICE_DOMAINS,
  BinarySensorConfig,
  domain,
  generated_entity_split,
  GET_CONFIG,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
  PUSH_PROXY,
  PUSH_PROXY_DOMAINS,
  SensorConfig,
  StorageData,
  SwitchConfig,
  UPDATE_TRIGGER,
} from "../../types";
import { HassFetchAPIService } from "../hass-fetch-api.service";

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

type ProxyMapValue<DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS> =
  DOMAIN extends PUSH_PROXY_DOMAINS
    ? PUSH_PROXY<PICK_GENERATED_ENTITY<DOMAIN>>
    : undefined;

const CACHE_KEY = (id: string) => `push_entity:${id}`;
const LOG_CONTEXT = (entity_id: PICK_GENERATED_ENTITY) => {
  const [domain, id] = entity_id.split(".");
  const tag = "Push" + TitleCase(domain).replace(" ", "");
  return `${tag}(${id})`;
};

const STORAGE: PushStorageMap = new Map();

const proxyMap = new Map<
  PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS>,
  ProxyMapValue<PUSH_PROXY_DOMAINS>
>();
const proxyOptions = new Map<
  PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS>,
  ProxyOptions
>();

export type PushStorageMap<
  DOMAIN extends PUSH_PROXY_DOMAINS = PUSH_PROXY_DOMAINS,
> = Map<PICK_GENERATED_ENTITY<DOMAIN>, StorageData<GET_CONFIG<DOMAIN>>>;

/**
 * TODO: Update type to emit errors if using a hard coded id
 */
export type NewEntityId<CREATE_DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS> =
  `${CREATE_DOMAIN}.${string}`;

type SettableProperties = "state" | `attributes.${string}`;

@Injectable()
export class PushEntityService<
  DOMAIN extends PUSH_PROXY_DOMAINS = PUSH_PROXY_DOMAINS,
> {
  constructor(
    private readonly logger: AutoLogService,
    private readonly fetch: HassFetchAPIService,
    private readonly cache: CacheService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
  ) {
    configuration.generate_entities ??= {};
  }

  public domainStorage(search: DOMAIN): PushStorageMap<DOMAIN> {
    return new Map(
      [...STORAGE.entries()].filter(([id]) => domain(id) === search),
    ) as PushStorageMap<DOMAIN>;
  }

  public async emitUpdate<
    STATE extends unknown = unknown,
    ATTRIBUTES extends object = object,
  >(
    sensor_id: PICK_GENERATED_ENTITY<DOMAIN>,
    updates: MergeAndEmit<STATE, ATTRIBUTES>,
  ): Promise<void> {
    const data = STORAGE.get(sensor_id);
    const name = LOG_CONTEXT(sensor_id);
    const key = CACHE_KEY(sensor_id);
    let dirty = false;
    // Merge state
    if ("state" in updates && data.state !== updates.state) {
      this.logger.trace(
        { from: data.state, name, to: updates.state },
        `update state`,
      );
      data.state = updates.state;
      dirty = true;
    }
    // Merge attributes
    if ("attributes" in updates) {
      Object.keys(updates.attributes).forEach(key => {
        const from = data.attributes[key];
        const to = updates.attributes[key];
        const matches = is.equal(from, to);
        if (matches) {
          return;
        }
        this.logger.trace({ from, name, to }, `updating attribute`);
        dirty = true;
      });
    }
    // Refresh / replace cache data
    await this.cache.set(key, data);
    if (dirty) {
      STORAGE.set(sensor_id, data);
    } else {
      this.logger.trace({ name }, `no changes to flush`);
    }
    const friendly_name = get(
      this.configuration.generate_entities,
      sensor_id,
    )?.name;
    const update = {
      attributes: {
        ...data.attributes,
        friendly_name,
      },
      state: this.cast(data.state as string | number | boolean),
    };
    // Emit to home assistant anyways?
    // await this.fetch.updateEntity(sensor_id, update);
    await this.fetch.webhook(UPDATE_TRIGGER.event(sensor_id), update);
  }

  public async generate<
    ENTITY extends PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS> &
      PICK_GENERATED_ENTITY<DOMAIN> = PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS> &
      PICK_GENERATED_ENTITY<DOMAIN>,
  >(entity: ENTITY, options: ProxyOptions): Promise<PUSH_PROXY<ENTITY>> {
    // If data has already been initialized, return the existing proxy
    if (proxyOptions.has(entity)) {
      return proxyMap.get(entity) as PUSH_PROXY<ENTITY>;
    }
    proxyOptions.set(entity, options);
    const context = LOG_CONTEXT(entity);
    this.logger.info({ context }, `initializing`);
    proxyMap.set(
      entity,
      new Proxy(
        {},
        {
          get: (t, property: string) => this.proxyGet(entity, property),
          set: (t, property: SettableProperties, value) =>
            this.proxySet(entity, property, value),
        },
      ) as ProxyMapValue<DOMAIN>,
    );
    await this.initializeCache(entity, context);
    return proxyMap.get(entity) as PUSH_PROXY<ENTITY>;
  }

  public get(entity: PICK_GENERATED_ENTITY<DOMAIN>) {
    return STORAGE.get(entity);
  }

  public insert(
    entity: NewEntityId<"binary_sensor">,
    config: BinarySensorConfig,
  ): void;
  public insert(entity: NewEntityId<"sensor">, config: SensorConfig): void;
  public insert(entity: NewEntityId<"switch">, config: SwitchConfig): void;
  public insert<CREATE_DOMAIN extends DOMAIN = DOMAIN>(
    entity: NewEntityId<CREATE_DOMAIN>,
    config: GET_CONFIG<CREATE_DOMAIN>,
  ) {
    this.logger.debug({ config }, `[%s] insert`, entity);
    const [domain, id] = generated_entity_split(entity);
    this.configuration.generate_entities[domain] ??= {};
    this.configuration.generate_entities[domain][id] = config;
  }

  public proxyGet(entity: PICK_GENERATED_ENTITY<DOMAIN>, property: string) {
    const options = proxyOptions.get(entity);
    if (options.getter) {
      return options.getter(property);
    }
    return get(this.get(entity), property);
  }

  public proxySet(
    entity: PICK_GENERATED_ENTITY<DOMAIN>,
    property: SettableProperties,
    value: unknown,
  ): boolean {
    const options = proxyOptions.get(entity);
    const status = options.validate(property, value);
    if (!status) {
      this.logger.error({ entity, value }, `Value failed validation`);
      return false;
    }
    const update = {};
    set(update, property, value);
    nextTick(async () => await this.emitUpdate(entity, update));
    return true;
  }

  private cast(value: string | number | boolean) {
    if (is.boolean(value)) {
      return value ? "on" : "off";
    }
    if (is.undefined(value)) {
      return "";
    }
    return String(value);
  }

  private async initializeCache(
    entity: PICK_GENERATED_ENTITY<DOMAIN>,
    context: string,
  ) {
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
      const equal = is.equal(value.config, config);
      if (!equal) {
        this.logger.warn({ context }, `Changed configuration`);
      }
      data.attributes = value.attributes;
      data.state = value.state;
    } else {
      this.logger.info({ context }, `initial cache populate`);
      await this.cache.set(key, data);
    }
    STORAGE.set(entity, data);
  }
}
