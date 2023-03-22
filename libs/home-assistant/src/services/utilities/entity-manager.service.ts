import { forwardRef, Inject, Injectable } from "@nestjs/common";
import {
  AutoLogService,
  ModuleScannerService,
} from "@digital-alchemy/boilerplate";
import {
  eachSeries,
  EMPTY,
  INCREMENT,
  is,
  SECOND,
  sleep,
  START,
} from "@digital-alchemy/utilities";
import dayjs from "dayjs";
import { get, set } from "object-path";
import { exit, nextTick } from "process";
import { Get } from "type-fest";
import { v4 } from "uuid";

import { OnEntityUpdate, OnEntityUpdateOptions } from "../../decorators";
import {
  ALL_DOMAINS,
  ENTITY_STATE,
  EntityHistoryDTO,
  EntityHistoryResult,
  HASSIO_WS_COMMAND,
  PICK_ENTITY,
} from "../../types";
import { HassFetchAPIService } from "../hass-fetch-api.service";
import { HassSocketAPIService } from "../hass-socket-api.service";

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
const FAILED_LOAD_DELAY = 5;
const MAX_ATTEMPTS = 50;
const FAILED = 1;

const emittingEvents = new Map<PICK_ENTITY, number>();
const entityWatchers = new Map<PICK_ENTITY, Watcher[]>();
/**
 * MASTER_STATE.switch.desk_light = {entity_id,state,attributes,...}
 */
let MASTER_STATE: Record<
  ALL_DOMAINS,
  Record<string, ENTITY_STATE<PICK_ENTITY>>
> = {};
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
    private readonly scanner: ModuleScannerService,
  ) {}

  public init = false;

  /**
   * Retrieve an entity's state
   */
  public byId<ENTITY_ID extends PICK_ENTITY>(
    entity_id: ENTITY_ID,
  ): ENTITY_STATE<ENTITY_ID> {
    return get(MASTER_STATE, entity_id);
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
  public findByDomain<DOMAIN extends ALL_DOMAINS = ALL_DOMAINS>(
    target: DOMAIN,
  ) {
    return Object.values(MASTER_STATE[target] ?? {}) as ENTITY_STATE<
      PICK_ENTITY<DOMAIN>
    >[];
  }

  /**
   * Retrieve an entity's state
   */
  public getEntities<
    T extends ENTITY_STATE<PICK_ENTITY> = ENTITY_STATE<PICK_ENTITY>,
  >(entityId: PICK_ENTITY[]): T[] {
    return entityId.map(id => this.byId(id) as T);
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
  public isEntity(entityId: PICK_ENTITY): entityId is PICK_ENTITY {
    return is.undefined(get(MASTER_STATE, entityId));
  }

  /**
   * Simple listing of all entity ids
   */
  public listEntities(): PICK_ENTITY[] {
    return Object.keys(MASTER_STATE).flatMap(domain =>
      Object.keys(MASTER_STATE[domain]).map(
        id => `${domain}.${id}` as PICK_ENTITY,
      ),
    );
  }

  /**
   * Wait for this entity to change state.
   * Returns next state (however long it takes for that to happen)
   */
  public async nextState<ID extends PICK_ENTITY = PICK_ENTITY>(
    entity_id: ID,
  ): Promise<ENTITY_STATE<ID>> {
    return await new Promise<ENTITY_STATE<ID>>(done => {
      const current = entityWatchers.get(entity_id) ?? [];
      const item: Watcher = {
        callback: new_state => done(new_state as ENTITY_STATE<ID>),
        id: v4(),
        type: "once",
      };
      current.push(item);
      entityWatchers.set(entity_id, current);
    });
  }

  /**
   * Clear out the current state, and request a refresh.
   *
   * Refresh occurs through home assistant rest api, and is not bound by the websocket lifecycle
   */
  public async refresh(recursion = START): Promise<void> {
    const states = await this.fetch.getAllEntities();
    if (is.empty(states)) {
      if (recursion > MAX_ATTEMPTS) {
        this.logger.fatal(
          `Failed to load service list from Home Assistant. Validate configuration`,
        );
        exit(FAILED);
      }
      this.logger.warn(
        "Failed to retrieve {entity} list. Retrying {%s}/[%s]",
        recursion,
        MAX_ATTEMPTS,
      );
      await sleep(FAILED_LOAD_DELAY * SECOND);
      await this.refresh(recursion + INCREMENT);
      return;
    }
    const oldState = MASTER_STATE;
    MASTER_STATE = {};

    states.forEach(entity => {
      // ? Set first, ensure data is populated
      // `nextTick` will fire AFTER loop finishes
      set(
        MASTER_STATE,
        entity.entity_id,
        entity,
        get(oldState, entity.entity_id),
      );
      if (!this.init) {
        return;
      }
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
    set(MASTER_STATE, entity_id, new_state);
    const value = emittingEvents.get(entity_id);
    if (value > EMPTY) {
      this.logger.error(
        `[%s] emitted an update before the previous finished processing`,
      );
      emittingEvents.set(entity_id, value + INCREMENT);
      return;
    }

    const list = entityWatchers.get(entity_id);
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

  protected async onModuleInit() {
    this.scan();
    await this.refresh();
  }

  protected proxyGetLogic<
    ENTITY extends PICK_ENTITY = PICK_ENTITY,
    PROPERTY extends string = string,
  >(entity: ENTITY, property: PROPERTY): Get<ENTITY_STATE<ENTITY>, PROPERTY> {
    if (!this.init) {
      return undefined;
    }
    const valid = ["state", "attributes"].some(i => property.startsWith(i));
    if (!valid) {
      return;
    }
    const current = this.byId<ENTITY>(entity);
    const defaultValue = (property === "state" ? undefined : {}) as Get<
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
    const current = entityWatchers.get(entity_id) ?? [];
    const filtered = current.filter(watcher => id !== watcher.id);
    if (is.empty(filtered)) {
      entityWatchers.delete(entity_id);
      return;
    }
    entityWatchers.set(entity_id, filtered);
  }

  private scan(): void {
    this.scanner.bindMethodDecorator<OnEntityUpdateOptions>(
      OnEntityUpdate,
      ({ exec, context, data }) => {
        const list = [data].flat();
        this.logger.info(
          { context },
          `[@OnEntityUpdate] {%s entities}`,
          list.length,
        );
        list.forEach(entity_id => {
          this.logger.debug({ context }, ` - {%s}`, entity_id);
          const current = entityWatchers.get(entity_id) ?? [];
          const item: Watcher<typeof entity_id> = {
            callback: async (...data) => {
              this.logger.trace({ context }, `[OnEntityUpdate](%s)`, entity_id);
              await exec(...data);
            },
            id: v4(),
            type: "annotation",
          };
          current.push(item);
          entityWatchers.set(entity_id, current);
        });
      },
    );
  }
}
