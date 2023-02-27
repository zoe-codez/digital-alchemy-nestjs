import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { AutoLogService, ModuleScannerService } from "@steggy/boilerplate";
import { eachSeries, EMPTY, INCREMENT, is } from "@steggy/utilities";
import dayjs from "dayjs";
import EventEmitter from "eventemitter3";
import { get, set } from "object-path";
import { nextTick } from "process";
import { Get } from "type-fest";
import { v4 } from "uuid";

import { OnEntityUpdate, OnEntityUpdateOptions } from "../decorators";
import {
  ALL_DOMAINS,
  domain,
  ENTITY_STATE,
  EntityHistoryDTO,
  EntityHistoryResult,
  HASSIO_WS_COMMAND,
  PICK_ENTITY,
} from "../types";
import { HassFetchAPIService } from "./hass-fetch-api.service";
import { HassSocketAPIService } from "./hass-socket-api.service";

type WatchFunction<ENTITY_ID extends PICK_ENTITY> = (
  new_state: ENTITY_STATE<ENTITY_ID>,
  old_state: ENTITY_STATE<ENTITY_ID>,
) => Promise<void> | void;
type Watcher<ENTITY_ID extends PICK_ENTITY = PICK_ENTITY> = {
  callback: WatchFunction<ENTITY_ID>;
  id: string;
  type: "once" | "dynamic" | "annotation";
};
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
    private readonly scanner: ModuleScannerService,
  ) {}

  public readonly ENTITIES = new Map<PICK_ENTITY, ENTITY_STATE<PICK_ENTITY>>();

  /**
   * MASTER_STATE.switch.desk_light = {entity_id,state,attributes,...}
   */
  public MASTER_STATE: Record<
    ALL_DOMAINS,
    Record<string, ENTITY_STATE<PICK_ENTITY>>
  > = {};
  public init = false;
  private readonly emittingEvents = new Map<PICK_ENTITY, number>();
  private readonly entityWatchers = new Map<PICK_ENTITY, Watcher[]>();

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
  public getEntities<
    T extends ENTITY_STATE<PICK_ENTITY> = ENTITY_STATE<PICK_ENTITY>,
  >(entityId: PICK_ENTITY[]): T[] {
    return entityId.map(id => this.ENTITIES.get(id) as T);
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
    return await new Promise<ENTITY_STATE<ID>>(done => {
      const current = this.entityWatchers.get(entity_id) ?? [];
      const item: Watcher = {
        callback: new_state => done(new_state as ENTITY_STATE<ID>),
        id: v4(),
        type: "once",
      };
      current.push(item);
      this.entityWatchers.set(entity_id, current);
    });
  }

  /**
   * Clear out the current state, and request a refresh.
   *
   * Refresh occurs through home assistant rest api, and is not bound by the websocket lifecycle
   */
  public async refresh(): Promise<void> {
    const states = await this.fetch.getAllEntities();
    const oldState = this.MASTER_STATE;
    this.MASTER_STATE = {};

    states.forEach(entity => {
      // ? Set first, ensure data is populated
      // `nextTick` will fire AFTER loop finishes
      set(
        this.MASTER_STATE,
        entity.entity_id,
        entity,
        get(oldState, entity.entity_id),
      );
      const old = get(oldState, entity.entity_id);
      if (is.equal(old, entity)) {
        this.logger.trace(`[%s] no change on refresh`, entity.entity_id);
        return;
      }
      nextTick(async () => {
        await this.onEntityUpdate(entity.entity_id, entity);
      });
    });
    this.init = true;
  }

  protected async onApplicationBootstrap() {
    await this.refresh();
  }

  /**
   * Pretend like this has an `@OnEvent(HA_EVENT_STATE_CHANGE)` on it.
   * Socket service calls this separately from the event to ensure data is available here first.
   *
   * Leave as protected method to hide from editor auto complete
   */
  protected async onEntityUpdate<ENTITY extends PICK_ENTITY = PICK_ENTITY>(
    entity_id: PICK_ENTITY,
    new_state: ENTITY_STATE<ENTITY>,
    old_state?: ENTITY_STATE<ENTITY>,
  ): Promise<void> {
    set(this.MASTER_STATE, entity_id, new_state);
    const value = this.emittingEvents.get(entity_id);
    if (value > EMPTY) {
      this.logger.error(
        `[%s] emitted an update before the previous finished processing`,
      );
      this.emittingEvents.set(entity_id, value + INCREMENT);
      return;
    }

    const list = this.entityWatchers.get(entity_id);
    if (is.empty(list)) {
      return;
    }
    await eachSeries(list, async watcher => {
      await watcher.callback(new_state, old_state);
      if (watcher.type === "once") {
        this.remove(entity_id, watcher.id);
      }
    });
  }

  protected onModuleInit() {
    this.scan();
  }

  protected proxyGetLogic<
    ENTITY extends PICK_ENTITY = PICK_ENTITY,
    PROPERTY extends string = string,
  >(entity: ENTITY, property: PROPERTY): Get<ENTITY_STATE<ENTITY>, PROPERTY> {
    if (!this.init) {
      return undefined;
    }
    const current = this.byId<ENTITY>(entity);
    const defaultValue = (property === "attributes" ? {} : undefined) as Get<
      ENTITY_STATE<ENTITY>,
      PROPERTY
    >;
    if (!current) {
      this.logger.error(
        { context: `InjectEntityProxy(${entity})`, defaultValue },
        `[proxyGetLogic] cannot find entity {%s}`,
        property,
      );
    }
    return get(current, property, defaultValue);
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
      { context: `InjectEntityProxy(${entity})`, property, value },
      `Entity proxy does not accept value setting`,
    );
    return false;
  }

  private remove(entity_id: PICK_ENTITY, id: string): void {
    const current = this.entityWatchers.get(entity_id) ?? [];
    const filtered = current.filter(watcher => id !== watcher.id);
    if (is.empty(filtered)) {
      this.entityWatchers.delete(entity_id);
      return;
    }
    this.entityWatchers.set(entity_id, filtered);
  }

  private scan(): void {
    this.scanner.bindMethodDecorator<OnEntityUpdateOptions>(
      OnEntityUpdate,
      ({ exec, context, data }) => {
        const list = [data].flat();
        list.forEach(entity_id => {
          const current = this.entityWatchers.get(entity_id) ?? [];
          const item: Watcher<typeof entity_id> = {
            callback: async (...data) => {
              this.logger.trace({ context }, `[OnEntityUpdate](%s)`, entity_id);
              await exec(...data);
            },
            id: v4(),
            type: "annotation",
          };
          current.push(item);
          this.entityWatchers.set(entity_id, current);
        });
      },
    );
  }
}
