import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { AutoLogService, CacheService } from "@steggy/boilerplate";
import { is, TitleCase } from "@steggy/utilities";
import deepEqual from "deep-equal";
import { get, set } from "object-path";
import { nextTick } from "process";

import {
  ALL_GENERATED_SERVICE_DOMAINS,
  domain,
  generated_entity_split,
  GET_CONFIG,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
  PUSH_PROXY,
  PUSH_PROXY_DOMAINS,
  StorageData,
  UPDATE_TRIGGER,
} from "../types";
import { EntityManagerService } from "./entity-manager.service";
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

export type PushStorageMap<
  DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS = ALL_GENERATED_SERVICE_DOMAINS,
> = Map<PICK_GENERATED_ENTITY<DOMAIN>, StorageData<GET_CONFIG<DOMAIN>>>;

/**
 * TODO: Update type to emit errors if using a hard coded id
 */
type NewEntityId<CREATE_DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS> =
  `${CREATE_DOMAIN}.${string}`;

@Injectable()
export class PushEntityService<
  DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS = ALL_GENERATED_SERVICE_DOMAINS,
> {
  constructor(
    private readonly logger: AutoLogService,
    private readonly fetch: HassFetchAPIService,
    private readonly cache: CacheService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
    @Inject(forwardRef(() => EntityManagerService))
    private readonly entityRegistry: EntityManagerService,
  ) {
    configuration.generate_entities ??= {};
  }

  private readonly STORAGE: PushStorageMap = new Map();

  private readonly proxyMap = new Map<
    PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS>,
    ProxyMapValue<DOMAIN>
  >();

  public domainStorage(search: DOMAIN): PushStorageMap<DOMAIN> {
    return new Map(
      [...this.STORAGE.entries()].filter(([id]) => domain(id) === search),
    ) as PushStorageMap<DOMAIN>;
  }

  public async emitUpdate<
    STATE extends unknown = unknown,
    ATTRIBUTES extends object = object,
  >(
    sensor_id: PICK_GENERATED_ENTITY<DOMAIN>,
    updates: MergeAndEmit<STATE, ATTRIBUTES>,
  ): Promise<void> {
    const data = this.STORAGE.get(sensor_id);
    const context = LOG_CONTEXT(sensor_id);
    const key = CACHE_KEY(sensor_id);
    let dirty = false;
    // Merge state
    if ("state" in updates && data.state !== updates.state) {
      this.logger.trace(
        { context, from: data.state, to: updates.state },
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
    await this.fetch.webhook(UPDATE_TRIGGER.event(sensor_id), {
      attributes: data.attributes,
      state: this.cast(data.state as string | number | boolean),
    });
  }

  public async generate<
    ENTITY extends PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS> = PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS>,
  >(entity: ENTITY, options: ProxyOptions): Promise<PUSH_PROXY<ENTITY>> {
    // ! Type Fixer 5000
    let out: unknown;

    if (this.proxyMap.has(entity)) {
      out = this.proxyMap.get(entity);
      return out as PUSH_PROXY<ENTITY>;
    }
    const context = LOG_CONTEXT(entity);
    this.logger.info({ context }, `initializing`);
    const proxy = new Proxy(
      {},
      {
        get: (t, property: string) => {
          if (options.getter) {
            return options.getter(property);
          }
          return get(
            this.get(entity as PICK_GENERATED_ENTITY<DOMAIN>),
            property,
          );
        },
        set: (t, property: string, value) => {
          const status = options.validate(property, value);
          if (!status) {
            this.logger.error({ entity, value }, `Value failed validation`);
            return false;
          }
          const update = {};
          set(update, property, value);
          nextTick(
            async () =>
              await this.emitUpdate(
                entity as PICK_GENERATED_ENTITY<DOMAIN>,
                update,
              ),
          );
          return true;
        },
      },
    ) as ProxyMapValue<DOMAIN>;
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
      this.logger.info({ context }, `initial cache populate`);
      await this.cache.set(key, data);
    }
    this.STORAGE.set(entity, data);

    out = proxy;
    return out as PUSH_PROXY<ENTITY>;
  }

  public get(entity: PICK_GENERATED_ENTITY<DOMAIN>) {
    return this.STORAGE.get(entity);
  }

  public insert<CREATE_DOMAIN extends DOMAIN = DOMAIN>(
    entity: NewEntityId<CREATE_DOMAIN>,
    config: GET_CONFIG<CREATE_DOMAIN>,
  ) {
    this.logger.debug({ config }, `[%s] insert`, entity);
    const [domain, id] = generated_entity_split(entity);
    this.configuration.generate_entities[domain] ??= {};
    this.configuration.generate_entities[domain][id] = config;
  }

  private cast(value: string | number | boolean) {
    if (is.boolean(value)) {
      return value ? "1" : "0";
    }
    if (is.undefined(value)) {
      return "";
    }
    return String(value);
  }
}