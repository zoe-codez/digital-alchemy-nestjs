import {
  AutoLogService,
  FetchService,
  InjectConfig,
} from "@digital-alchemy/boilerplate";
import {
  DOWN,
  FilteredFetchArguments,
  is,
  NO_CHANGE,
  SECOND,
  UP,
} from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import dayjs from "dayjs";
import EventEmitter from "eventemitter3";

import { BASE_URL, TOKEN } from "../config";
import {
  CalendarEvent,
  CalendarFetchOptions,
  CallServiceCommandData,
  CheckConfigResult,
  ENTITY_STATE,
  GenericEntityDTO,
  HASS_CALENDAR_SEARCH,
  HASS_CALL_SERVICE,
  HASS_SEND_WEBHOOK,
  HassConfig,
  HassSendWebhookData,
  HassServiceDTO,
  HomeAssistantServerLogItem,
  PICK_ENTITY,
  PICK_SERVICE,
  PICK_SERVICE_PARAMETERS,
  RawCalendarEvent,
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
    private readonly event: EventEmitter,
  ) {
    fetchService.BASE_URL = this.baseUrl;
  }

  public get valid() {
    return !is.empty(this.baseUrl) && !is.empty(this.bearer);
  }

  /**
   * Fetch events from calendars on home assistant
   *
   * If multiple calendars are provided, events are sorted together by date
   */
  public async calendarSearch({
    calendar,
    start = dayjs(),
    end,
  }: CalendarFetchOptions): Promise<CalendarEvent[]> {
    if (is.array(calendar)) {
      const list = await Promise.all(
        calendar.map(
          async calendar => await this.calendarSearch({ calendar, end, start }),
        ),
      );
      return list.flat().sort((a, b) => {
        if (a.start.isSame(b.start)) {
          return NO_CHANGE;
        }
        return a.start.isAfter(b.start) ? UP : DOWN;
      });
    }
    const params = {
      end: end.toISOString(),
      start: start.toISOString(),
    };
    const events = await this.fetch<RawCalendarEvent[]>({
      params,
      url: `/api/calendars/${calendar}`,
    });
    this.logger.trace(
      { ...params },
      `[%s] search found {%s} events`,
      calendar,
      events.length,
    );
    this.event.emit(HASS_CALENDAR_SEARCH);
    return events.map(({ start, end, ...extra }) => ({
      ...extra,
      end: dayjs(end.dateTime),
      start: dayjs(start.dateTime),
    }));
  }

  public async callService<SERVICE extends PICK_SERVICE>(
    serviceName: SERVICE,
    data: PICK_SERVICE_PARAMETERS<SERVICE>,
  ): Promise<ENTITY_STATE<PICK_ENTITY>[]> {
    const [domain, service] = serviceName.split(".");
    this.event.emit(HASS_CALL_SERVICE, {
      domain,
      service,
      type: "fetch",
    } as CallServiceCommandData);
    return await this.fetch({
      body: { ...(data as object) },
      method: "post",
      url: `/api/services/${domain}/${service}`,
    });
  }

  /**
   * Pass through of home assistant's yaml check
   */
  public async checkConfig(): Promise<CheckConfigResult> {
    this.logger.trace(`Check config`);
    return await this.fetch({
      method: `post`,
      url: `/api/config/core/check_config`,
    });
  }

  public async download(
    destination: string,
    fetchWitch: FilteredFetchArguments,
  ): Promise<void> {
    return await this.fetchService.download({
      ...fetchWitch,
      baseUrl: this.baseUrl,
      destination,
      headers: { Authorization: `Bearer ${this.bearer}` },
    });
  }

  public async fetch<T>(fetchWitch: FilteredFetchArguments): Promise<T> {
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
    this.logger.trace({ name: event, ...data }, `Firing event`);
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
    this.logger.trace(`Get all entities`);
    return await this.fetch<GenericEntityDTO[]>({
      url: `/api/states`,
    });
  }

  public async getConfig(): Promise<HassConfig> {
    this.logger.trace(`Get config`);
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
    this.logger.trace(`Get logs`);
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
    this.logger.trace(`Get raw logs`);
    return await this.fetch<string>({
      process: "text",
      url: `/api/error_log`,
    });
  }

  public async listServices(): Promise<HassServiceDTO[]> {
    this.logger.trace(`List services`);
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
    this.logger.trace({ ...body, name: entity_id }, `Set entity state`);
    return await this.fetch({
      body,
      method: "post",
      url: `/api/states/${entity_id}`,
    });
  }

  public async webhook(name: string, data: object = {}): Promise<void> {
    this.logger.trace({ ...data, name }, `Webhook`);
    this.event.emit(HASS_SEND_WEBHOOK, { name } as HassSendWebhookData);
    await this.fetch({
      body: data,
      method: "post",
      process: "text",
      url: `/api/webhook/${name}`,
    });
  }
}
