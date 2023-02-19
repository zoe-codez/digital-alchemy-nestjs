import { Injectable } from "@nestjs/common";
import {
  AutoLogService,
  FetchService,
  InjectConfig,
} from "@steggy/boilerplate";
import { FetchWith, is, SECOND } from "@steggy/utilities";

import { BASE_URL, TOKEN } from "../config";
import {
  ENTITY_STATE,
  GenericEntityDTO,
  HassConfig,
  HassServiceDTO,
  HomeAssistantServerLogItem,
  PICK_ENTITY,
} from "../contracts";

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
  public async checkConfig(): Promise<unknown> {
    return await this.fetch({
      method: `post`,
      url: `/api/config/core/check_config`,
    });
  }

  public async download(
    destination: string,
    fetchWitch: FetchWith,
  ): Promise<void> {
    return await this.fetchService.download({
      baseUrl: this.baseUrl,
      destination,
      headers: { Authorization: `Bearer ${this.bearer}` },
      ...fetchWitch,
    });
  }

  public async fetch<T>(fetchWitch: FetchWith): Promise<T> {
    return await this.fetchService.fetch<T>({
      baseUrl: this.baseUrl,
      headers: { Authorization: `Bearer ${this.bearer}` },
      ...fetchWitch,
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
    if (!Array.isArray(result)) {
      this.logger.error({ result }, `Unexpected return result`);
      return [];
    }
    const [history] = result;
    return history;
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
}
