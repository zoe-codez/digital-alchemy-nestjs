import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";
import dayjs from "dayjs";
import { EventEmitter } from "ws";

import { OnEntityUpdate } from "../decorators";
import {
  ALL_DOMAINS,
  domain,
  ENTITY_STATE,
  EntityHistoryDTO,
  EntityHistoryResult,
  GenericEntityDTO,
  HassEventDTO,
  HASSIO_WS_COMMAND,
  PICK_ENTITY,
} from "../types";
import { HassFetchAPIService } from "./hass-fetch-api.service";
import { HassSocketAPIService } from "./hass-socket-api.service";

const TIMEOUT = 5000;
const TIME_OFFSET = 1000;

/**
 * Global entity tracking, the source of truth for anything needing to retrieve the current state of anything
 *
 * Keeps a local cache of all observed entities with the most up to date state available.
 * An observable can be retrieved for monitoring a single entity's state.
 */
@Injectable()
export class EntityManagerService {
  constructor(
    private readonly fetch: HassFetchAPIService,
    @Inject(forwardRef(() => HassSocketAPIService))
    private readonly socket: HassSocketAPIService,
    private readonly logger: AutoLogService,
    private readonly eventEmitter: EventEmitter,
  ) {}

  public readonly ENTITIES = new Map<PICK_ENTITY, GenericEntityDTO>();

  /**
   * MASTER_STATE.switch.desk_light = {entity_id,state,attributes,...}
   */
  public MASTER_STATE: Record<string, Record<string, GenericEntityDTO>> = {};

  public init = false;

  /**
   * Retrieve an entity's state
   */
  public byId<T extends PICK_ENTITY>(id: T): ENTITY_STATE<T> {
    return this.ENTITIES.get(id) as ENTITY_STATE<T>;
  }

  public createEntityProxy(entity: PICK_ENTITY) {
    return new Proxy({} as ENTITY_STATE<typeof entity>, {
      get: (t, property: string) => this.proxyGetLogic(entity, property),
      set: (t, property: string, value: unknown) =>
        this.proxySetLogic(entity, property, value),
    });
  }

  /**
   * list all entities by domain
   */
  public findByDomain<
    DOMAIN extends ALL_DOMAINS = ALL_DOMAINS,
    STATES extends ENTITY_STATE<PICK_ENTITY<DOMAIN>> = ENTITY_STATE<
      PICK_ENTITY<DOMAIN>
    >,
  >(target: DOMAIN): STATES[] {
    const out: STATES[] = [];
    this.ENTITIES.forEach((state, key) => {
      if (domain(key) === target) {
        out.push(state as STATES);
      }
    });
    return out.filter(i => is.object(i));
  }

  /**
   * Retrieve an entity's state
   */
  public getEntities<T extends GenericEntityDTO = GenericEntityDTO>(
    entityId: PICK_ENTITY[],
  ): T[] {
    return entityId.map(id => this.ENTITIES.get(id) as T);
  }

  /**
   * Retrieve the state for an entity that may or may not exist.
   * Has internal timeout
   *
   * Useful for secondary default values
   */
  public async getState<VALUE extends unknown>(
    entity_id: PICK_ENTITY,
    timeout = TIMEOUT,
  ): Promise<VALUE> {
    let done = false;
    return await new Promise((accept, reject) => {
      if (this.init) {
        done = true;
        accept(this.byId(entity_id).state);
        return;
      }
      const callback = result => {
        if (done) {
          // wat
          return;
        }
        accept(result);
        done = true;
      };
      setTimeout(() => {
        if (done) {
          return;
        }
        reject(`timeout`);
        done = true;
        this.eventEmitter.removeListener(
          OnEntityUpdate.updateEvent(entity_id),
          callback,
        );
      }, timeout);
      this.eventEmitter.once(OnEntityUpdate.updateEvent(entity_id), callback);
    });
  }

  public async history<ENTITES extends PICK_ENTITY[]>(
    payload: Omit<EntityHistoryDTO<ENTITES>, "type">,
  ) {
    const result = await this.socket.sendMessage({
      ...payload,
      end_time: dayjs(payload.end_time).toISOString(),
      start_time: dayjs(payload.start_time).toISOString(),
      type: HASSIO_WS_COMMAND.history_during_period,
    });
    return Object.fromEntries(
      Object.entries(result).map(
        <ID extends PICK_ENTITY>([entity_id, states]: [
          ID,
          { a: object; lu: number; s: unknown }[],
        ]) => {
          return [
            entity_id,
            states.map(data => {
              return {
                attributes: data.a,
                date: new Date(data.lu * TIME_OFFSET),
                state: data.s,
              } as EntityHistoryResult<ID>;
            }),
          ];
        },
      ),
    );
  }

  /**
   * is id a valid entity?
   */
  public isEntity(entityId: string): entityId is PICK_ENTITY {
    return this.ENTITIES.has(entityId as PICK_ENTITY);
  }

  /**
   * Simple listing of all entity ids
   */
  public listEntities(): PICK_ENTITY[] {
    return [...this.ENTITIES.keys()];
  }

  /**
   * Wait for this entity to change state.
   * Returns next state (however long it takes for that to happen)
   */
  public async nextState<ID extends PICK_ENTITY = PICK_ENTITY>(
    entity_id: ID,
  ): Promise<ENTITY_STATE<ID>> {
    return await new Promise<ENTITY_STATE<ID>>(done =>
      this.eventEmitter.once(OnEntityUpdate.updateEvent(entity_id), result =>
        done(result),
      ),
    );
  }

  /**
   * Clear out the current state, and request a refresh.
   *
   * Refresh occurs through home assistant rest api, and is not bound by the websocket lifecycle
   */
  public async refresh(): Promise<void> {
    const states = await this.fetch.getAllEntities();
    this.MASTER_STATE = {};
    Object.keys(this.MASTER_STATE).forEach(
      key => delete this.MASTER_STATE[key],
    );
    states.forEach(entity => {
      const [domain, id] = entity.entity_id.split(".");
      this.MASTER_STATE[domain] ??= {};
      this.MASTER_STATE[domain][id] = entity;

      const state = this.ENTITIES.get(entity.entity_id as PICK_ENTITY);
      if (state?.last_changed === entity.last_changed) {
        return;
      }
      this.ENTITIES.set(entity.entity_id as PICK_ENTITY, entity);
      this.eventEmitter.emit(
        OnEntityUpdate.updateEvent(entity.entity_id as PICK_ENTITY),
        entity.state,
      );
    });
    this.init = true;
  }

  /**
   * Pretend like this has an `@OnEvent(HA_EVENT_STATE_CHANGE)` on it.
   * Socket service calls this separately from the event to ensure data is available here first.
   *
   * Leave as protected method to hide from editor auto complete
   */
  protected onEntityUpdate(event: HassEventDTO): void {
    const { entity_id, new_state, old_state } = event.data;
    const [domain, id] = entity_id.split(".");

    this.MASTER_STATE[domain] ??= {};
    this.MASTER_STATE[domain][id] = new_state;
    this.ENTITIES.set(entity_id, new_state);
    this.eventEmitter.emit(
      OnEntityUpdate.updateEvent(entity_id),
      new_state,
      old_state,
      event,
    );
  }

  protected async onModuleInit(): Promise<void> {
    await this.refresh();
  }

  protected proxyGetLogic<ENTITY extends PICK_ENTITY = PICK_ENTITY>(
    entity: ENTITY,
    property: string,
  ): unknown {
    if (!this.init) {
      return undefined;
    }
    const current = this.byId<ENTITY>(entity);
    if (!current) {
      // Theory: attributes only gets accessed to use the sub-properties
      // It is frequent to forget optional chains `attribute?.friendly_name`
      // Providing an object by default reduces crashes
      // Doesn't matter for other properties, which aren't directly chained (or as generally used)
      const defaultValue = property === "attributes" ? {} : undefined;
      this.logger.error(
        { context: `InjectEntity(${entity})`, defaultValue },
        `Proxy cannot find entity to provide {${property}}. Is application in a valid state?`,
      );
      return defaultValue;
    }
    return current ? current[property] : undefined;
  }

  /**
   * ... should it? Seems like a bad idea
   */
  protected proxySetLogic<ENTITY extends PICK_ENTITY = PICK_ENTITY>(
    entity: ENTITY,
    property: string,
    value: unknown,
  ): boolean {
    this.logger.error(
      { context: `InjectEntity(${entity})`, property, value },
      `Entity proxy does not accept value setting`,
    );
    return false;
  }
}
