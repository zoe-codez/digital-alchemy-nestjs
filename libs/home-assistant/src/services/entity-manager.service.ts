import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";
import EventEmitter from "eventemitter3";

import {
  domain,
  ENTITY_STATE,
  GenericEntityDTO,
  HassEventDTO,
  PICK_ENTITY,
} from "../contracts";
import { ENTITY_SETUP } from "../dynamic";
import { HomeAssistantFetchAPIService } from "./ha-fetch-api.service";
import { InterruptService } from "./interrupt.service";

/**
 * Global entity tracking, the source of truth for anything needing to retrieve the current state of anything
 *
 * Keeps a local cache of all observed entities with the most up to date state available.
 * An observable can be retrieved for monitoring a single entity's state.
 */
@Injectable()
export class EntityManagerService {
  constructor(
    private readonly fetch: HomeAssistantFetchAPIService,
    private readonly logger: AutoLogService,
    private readonly eventEmitter: EventEmitter,
    private readonly interrupt: InterruptService,
  ) {}

  public readonly ENTITIES = new Map<PICK_ENTITY, GenericEntityDTO>();

  /**
   * MASTER_STATE.switch.desk_light = {entity_id,state,attributes,...}
   */
  public readonly MASTER_STATE: Record<
    string,
    Record<string, GenericEntityDTO>
  > = {};
  public readonly WATCHERS = new Map<string, unknown[]>();

  public findByDomain<T extends GenericEntityDTO = GenericEntityDTO>(
    target: keyof typeof ENTITY_SETUP,
  ): T[] {
    const out: T[] = [];
    this.ENTITIES.forEach((state, key) => {
      if (domain(key) === target) {
        out.push(state as T);
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
   * Retrieve an entity's state
   */
  public getEntity<T extends PICK_ENTITY>(id: T): ENTITY_STATE<T> {
    return this.ENTITIES.get(id) as ENTITY_STATE<T>;
  }

  public isEntity(entityId: string): entityId is PICK_ENTITY {
    return this.ENTITIES.has(entityId as PICK_ENTITY);
  }

  public listEntities(): PICK_ENTITY[] {
    return [...this.ENTITIES.keys()];
  }

  public async nextState<T extends GenericEntityDTO = GenericEntityDTO>(
    entityId: string,
  ): Promise<T> {
    return await new Promise<T>(done =>
      this.eventEmitter.once(`${entityId}/update`, result => done(result)),
    );
  }

  /**
   * Listen in on the HA_EVENT_STATE_CHANGE event
   *
   * This happens any time any entity has an update.
   * Global collection of updates
   */
  public onEntityUpdate(event: HassEventDTO): void {
    const { entity_id, new_state, old_state } = event.data;
    const [domain, id] = entity_id.split(".");

    this.MASTER_STATE[domain] ??= {};
    this.MASTER_STATE[domain][id] = new_state;
    if (this.WATCHERS.has(entity_id)) {
      this.logger.debug(
        { attributes: new_state.attributes },
        `[${entity_id}] state change {${new_state.state}}`,
      );
      this.WATCHERS.get(entity_id).push(new_state.state);
      return;
    }
    this.ENTITIES.set(entity_id, new_state);
    if (this.interrupt.EVENTS) {
      this.eventEmitter.emit(
        `${entity_id}/update`,
        new_state,
        old_state,
        event,
      );
    }
  }

  protected async onModuleInit(): Promise<void> {
    const states = await this.fetch.getAllEntities();
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
    });
  }
}
