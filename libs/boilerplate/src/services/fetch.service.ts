import { Injectable, Scope } from "@nestjs/common";
import {
  FetchArguments,
  FetchParameterTypes,
  FetchWith,
  FIRST,
  is,
  ResultControlDTO,
} from "@steggy/utilities";
import Bottleneck from "bottleneck";
import { createWriteStream } from "fs";
import fetch from "node-fetch";

import { TransientLogger } from "../decorators/inject-logger.decorator";
import { AutoLogService } from "./auto-log.service";

const DEFAULT_TRUNCATE_LENGTH = 200;
@Injectable({ scope: Scope.TRANSIENT })
export class FetchService {
  constructor(
    @TransientLogger()
    protected readonly logger: AutoLogService,
  ) {}

  public BASE_URL: string;
  public TRUNCATE_LENGTH = DEFAULT_TRUNCATE_LENGTH;

  private limiter: Bottleneck;

  public bottleneck(options: Bottleneck.ConstructorOptions): void {
    this.limiter = new Bottleneck(options);
    this.limiter.on("error", error => {
      this.logger.error({ ...error }, `Error caught in limiter`);
    });
  }

  public async download({
    destination,
    ...fetchWith
  }: Partial<FetchArguments> & { destination: string }): Promise<void> {
    const url: string = await this.fetchCreateUrl(fetchWith);
    const requestInit = await this.fetchCreateMeta(fetchWith);
    const response = await fetch(url, requestInit);
    await new Promise<void>((resolve, reject) => {
      const fileStream = createWriteStream(destination);
      response.body.pipe(fileStream);
      response.body.on("error", error => reject(error));
      fileStream.on("finish", () => resolve());
    });
  }

  public async fetch<T>(fetchWith: Partial<FetchArguments>): Promise<T> {
    if (this.limiter) {
      return this.limiter.schedule(
        async () => await this.immediateFetch(fetchWith),
      );
    }
    return await this.immediateFetch(fetchWith);
  }

  /**
   * Resolve url provided in args into a full path w/ domain
   */
  public fetchCreateUrl({ rawUrl, url, ...fetchWith }: FetchWith): string {
    let out = rawUrl ? url : `${fetchWith.baseUrl ?? this.BASE_URL}${url}`;
    if (/*fetchWith.control || */ fetchWith.params) {
      out = `${out}?${this.buildFilterString(fetchWith)}`;
    }
    return out;
  }
  /**
   * Resolve Filters and query params object into a query string.
   *
   * In case of collision, provided params take priority.
   */
  protected buildFilterString(
    fetchWith: FetchWith<{
      filters?: Readonly<ResultControlDTO>;
      params?: Record<string, FetchParameterTypes>;
    }>,
  ): string {
    return new URLSearchParams({
      // ...controlToQuery(fetchWith.control ?? {}),
      ...Object.fromEntries(
        Object.entries(fetchWith.params ?? {}).map(([label, value]) => [
          label,
          this.cast(value),
        ]),
      ),
    }).toString();
  }

  /**
   * Pre-request logic for fetch()
   *
   * Should return: headers, body, method
   */
  protected fetchCreateMeta({
    body,
    // jwtToken,
    // apiKey,
    // adminKey,
    // bearer,
    ...fetchWitch
  }: FetchWith): RequestInit {
    const headers = {
      ...fetchWitch.headers,
    } as Record<string, string>;
    let method = fetchWitch.method ?? "get";
    if (body) {
      // Override
      method = fetchWitch.method === "get" ? "post" : fetchWitch.method;
      headers["Content-Type"] = "application/json";
    }
    // if (jwtToken) {
    //   headers["x-jwt-token"] = jwtToken;
    // }
    // if (apiKey) {
    //   headers["x-token"] = apiKey;
    // }
    // if (adminKey) {
    //   headers["x-admin-key"] = adminKey;
    // }
    // if (bearer) {
    //   headers["Authorization"] = `Bearer ${bearer}`;
    // }
    if (is.object(body)) {
      body = JSON.stringify(body);
    }
    return {
      body: body as BodyInit,
      headers,
      method,
    };
  }

  /**
   * Post processing function for fetch()
   */

  protected async fetchHandleResponse<T extends unknown = unknown>(
    { process }: FetchWith,
    response: Response,
  ): Promise<T> {
    if (process === false) {
      return response as T;
    }
    const text = await response.text();
    if (process === "text") {
      return text as unknown as T;
    }
    if (!["{", "["].includes(text.charAt(FIRST))) {
      if (["OK"].includes(text)) {
        this.logger.debug({ text }, "Full response text");
      } else {
        // It's probably a coding error error, and not something a user did.
        // Will try to keep the array up to date if any other edge cases pop up
        this.logger.warn({ text }, `Unexpected API Response`);
      }
      return text as T;
    }
    const parsed = JSON.parse(text);
    return this.checkForHttpErrors<T>(parsed);
  }

  private async immediateFetch<T>(
    fetchWith: Partial<FetchArguments>,
  ): Promise<T> {
    const url: string = await this.fetchCreateUrl(fetchWith);
    const requestInit = await this.fetchCreateMeta(fetchWith);
    try {
      const response = await fetch(url, requestInit);
      if (fetchWith.process === false) {
        return response as unknown as T;
      }
      return await this.fetchHandleResponse(fetchWith, response);
    } catch (error) {
      this.logger.error({ error });
      return undefined;
    }
  }

  private cast(item: FetchParameterTypes): string {
    if (Array.isArray(item)) {
      return item.map(i => this.cast(i)).join(",");
    }
    if (item instanceof Date) {
      return item.toISOString();
    }
    if (is.number(item)) {
      return item.toString();
    }
    if (is.boolean(item)) {
      return item ? "true" : "false";
    }
    return item;
  }

  private checkForHttpErrors<T extends unknown = unknown>(maybeError: {
    error: string;
    message: string;
    statusCode: number;
  }): T {
    if (!is.object(maybeError) || maybeError === null) {
      return maybeError as T;
    }
    if (is.number(maybeError.statusCode) && is.string(maybeError.error)) {
      this.logger.error({ error: maybeError }, maybeError.message);
    }
    return maybeError as T;
  }
}
