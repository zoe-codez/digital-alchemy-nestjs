import { Injectable } from "@nestjs/common";
import {
  AutoLogService,
  FetchService,
  InjectConfig,
} from "@steggy/boilerplate";
import { FetchWith, is, SECOND } from "@steggy/utilities";

import { BASE_URL, TOKEN } from "../config";
import {
  CheckConfigResult,
  ENTITY_STATE,
  GenericEntityDTO,
  HassConfig,
  HassServiceDTO,
  HomeAssistantServerLogItem,
  PICK_ENTITY,
} from "../types";

type SendBody<
  STATE extends string | number = string,
  ATTRIBUTES extends object = object,
> = {
  attributes?: ATTRIBUTES;
  state?: STATE;
};

@Injectable()
export class HassFetchAPIService {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig(BASE_URL)
    private readonly baseUrl: string,
    @InjectConfig(TOKEN)
    private readonly bearer: string,
    private readonly fetchService: FetchService,
  ) {
    fetchService.BASE_URL = this.baseUrl;
  }

  public get valid() {
    return !is.empty(this.baseUrl) && !is.empty(this.bearer);
  }

  /**
   * Pass through of home assistant's yaml check
   */
  public async checkConfig(): Promise<CheckConfigResult> {
    return await this.fetch({
      method: `post`,
      url: `/api/config/core/check_config`,
    });
  }

  public async download(
    destination: string,
    fetchWitch: Omit<FetchWith, "baseUrl" | "headers" | "destination">,
  ): Promise<void> {
    return await this.fetchService.download({
      ...fetchWitch,
      baseUrl: this.baseUrl,
      destination,
      headers: { Authorization: `Bearer ${this.bearer}` },
    });
  }

  public async fetch<T>(
    fetchWitch: Omit<FetchWith, "baseUrl" | "headers">,
  ): Promise<T> {
    return await this.fetchService.fetch<T>({
      ...fetchWitch,
      baseUrl: this.baseUrl,
      headers: { Authorization: `Bearer ${this.bearer}` },
    });
  }

  public async fetchEntityCustomizations<
    T extends Record<never, unknown> = Record<
      "global" | "local",
      Record<string, string>
    >,
  >(entityId: string | string[]): Promise<T> {
    return await this.fetch<T>({
      url: `/api/config/customize/config/${entityId}`,
    });
  }

  /**
   * Request historical information about an entity
   */
  public async fetchEntityHistory<
    ENTITY extends PICK_ENTITY = PICK_ENTITY,
    T extends ENTITY_STATE<ENTITY> = ENTITY_STATE<ENTITY>,
  >(
    entity_id: ENTITY,
    from: Date,
    to: Date,
    extra: { minimal_response?: "" } = {},
  ): Promise<T[]> {
    this.logger.info(
      { from: from.toISOString(), to: to.toISOString() },
      `[${entity_id}] Fetch entity history`,
    );
    const result = await this.fetch<[T[]]>({
      params: {
        end_time: to.toISOString(),
        filter_entity_id: entity_id,
        ...extra,
      },
      url: `/api/history/period/${from.toISOString()}`,
    });
    if (!is.array(result)) {
      this.logger.error({ result }, `Unexpected return result`);
      return [];
    }
    const [history] = result;
    return history;
  }

  /**
   * Fire an event along the home assistant event bus
   *
   * Watch for it back (or the effects from) on the websocket!
   */
  public async fireEvent<DATA extends object = object>(
    event: string,
    data?: DATA,
  ): Promise<void> {
    this.logger.debug({ ...data }, `[%s] firing event`, event);
    const response = await this.fetch<{ message: string }>({
      body: { ...data },
      method: "post",
      url: `/api/events/${event}`,
    });
    if (response?.message !== `Event ${event} fired.`) {
      this.logger.debug({ response }, `Unexpected response from firing event`);
    }
  }

  /**
   * Pass through of home assistant's get logs.
   *
   * Correct timestamps for javascript-ness
   */
  public async getAllEntities(): Promise<GenericEntityDTO[]> {
    return await this.fetch<GenericEntityDTO[]>({
      url: `/api/states`,
    });
  }

  public async getConfig(): Promise<HassConfig> {
    return await this.fetch({
      url: `/api/config`,
    });
  }

  /**
   * Pass through of home assistant's get logs.
   *
   * Correct timestamps for javascript-ness
   */
  public async getLogs(): Promise<HomeAssistantServerLogItem[]> {
    const results = await this.fetch<HomeAssistantServerLogItem[]>({
      url: `/api/error/all`,
    });
    return results.map(i => {
      i.timestamp = Math.floor(i.timestamp * SECOND);
      i.first_occurred = Math.floor(i.first_occurred * SECOND);
      return i;
    });
  }

  /**
   * Pass through of home assistant's get logs.
   *
   * Correct timestamps for javascript-ness
   */
  public async getRawLogs(): Promise<string> {
    return await this.fetch<string>({
      process: "text",
      url: `/api/error_log`,
    });
  }

  public async listServices(): Promise<HassServiceDTO[]> {
    return await this.fetch<HassServiceDTO[]>({
      url: `/api/services`,
    });
  }

  public async updateEntity<
    STATE extends string | number = string,
    ATTRIBUTES extends object = object,
  >(
    entity_id: PICK_ENTITY,
    { attributes, state }: SendBody<STATE, ATTRIBUTES>,
  ): Promise<void> {
    const body: SendBody<STATE> = {};
    if (!is.undefined(state)) {
      body.state = state;
    }
    if (!is.empty(attributes)) {
      body.attributes = attributes;
    }
    return await this.fetch({
      body,
      method: "post",
      url: `/api/states/${entity_id}`,
    });
  }

  public async webhook(id: string, data: object = {}): Promise<void> {
    this.logger.trace({ id, data }, `webhook`);
    await this.fetch({
      body: data,
      method: "post",
      process: "text",
      url: `/api/webhook/${id}`,
    });
  }
}
