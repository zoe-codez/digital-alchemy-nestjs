import { Injectable } from "@nestjs/common";
import { is } from "@steggy/utilities";
import EventEmitter from "eventemitter3";

import {
  domain,
  ENTITY_STATE,
  GenericEntityDTO,
  HassEventDTO,
  PICK_ENTITY,
} from "../contracts";
import { OnEntityUpdate } from "../decorators";
import { ENTITY_SETUP } from "../dynamic";
import { HassFetchAPIService } from "./hass-fetch-api.service";

const TIMEOUT = 5000;

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
    private readonly eventEmitter: EventEmitter,
  ) {}

  public readonly ENTITIES = new Map<PICK_ENTITY, GenericEntityDTO>();

  /**
   * MASTER_STATE.switch.desk_light = {entity_id,state,attributes,...}
   */
  public MASTER_STATE: Record<string, Record<string, GenericEntityDTO>> = {};

  private init = false;

  /**
   * Retrieve an entity's state
   */
  public byId<T extends PICK_ENTITY>(id: T): ENTITY_STATE<T> {
    return this.ENTITIES.get(id) as ENTITY_STATE<T>;
  }

  /**
   * list all entities by domain
   */
  public findByDomain<
    DOMAIN extends keyof typeof ENTITY_SETUP = keyof typeof ENTITY_SETUP,
    STATES extends ENTITY_STATE<DOMAIN> = ENTITY_STATE<DOMAIN>,
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
        OnEntityUpdate.updateEvent(entity.entity_id),
        entity.state,
      );
    });
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
}
