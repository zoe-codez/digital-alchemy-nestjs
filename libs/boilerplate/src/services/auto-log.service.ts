import { Inject, Injectable, Scope } from "@nestjs/common";
import { INQUIRER } from "@nestjs/core";
import { is } from "@steggy/utilities";
import { AsyncLocalStorage } from "async_hooks";
import pino from "pino";

import {
  ACTIVE_APPLICATION,
  GetLogContext,
  iLogger,
  iLoggerCore,
  LogLevels,
  MISSING_CONTEXT,
} from "../contracts";
import { mappedContexts } from "../decorators";

export const storage = new AsyncLocalStorage<pino.Logger>();

/* eslint-disable @typescript-eslint/no-magic-numbers */
export type LoggerFunction =
  | ((message: string, ...arguments_: unknown[]) => void)
  | ((object: object, message?: string, ...arguments_: unknown[]) => void);

const NEST = "@nestjs";
export const NEST_NOOP_LOGGER = {
  error: (...items): void => {
    // eslint-disable-next-line no-console
    console.error(...items);
  },
  log: (): void => {
    //
  },
  warn: (): void => {
    //
  },
};

const logger = pino() as iLogger;

/**
 * Context aware wrapper around pino logger. Transient providers do not automatically find scopes, utilize `@InjectLogger()` to fix
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AutoLogService implements iLogger {
  public static logger: iLoggerCore = logger;
  public static nestLogger: Record<
    "log" | "warn" | "error" | "debug" | "verbose",
    (a: string, b: string) => void
  > = {
    debug: (message, context: string) =>
      AutoLogService.logger.debug({ context: `${NEST}:${context}` }, message),
    error: (message: string, context: string) =>
      AutoLogService.logger.error({ context: `${NEST}:${context}` }, message),
    log: (message, context) =>
      AutoLogService.logger.info({ context: `${NEST}:${context}` }, message),
    verbose: (message, context) =>
      AutoLogService.logger.debug({ context: `${NEST}:${context}` }, message),
    warn: (message, context) =>
      AutoLogService.logger.warn({ context: `${NEST}:${context}` }, message),
  };
  public static prettyLogger = false;

  /**
   * Decide which method of formatting log messages is correct
   *
   * - Normal: intended for production use cases
   * - Pretty: development use cases
   */
  public static call(
    method: pino.Level,
    context: string,
    ...parameters: Parameters<LoggerFunction>
  ): void {
    if (method === "trace" && AutoLogService.logger.level !== "trace") {
      // early shortcut for an over used call
      return;
    }
    const logger = this.getLogger();
    const data = is.object(parameters[0])
      ? (parameters.shift() as Record<string, unknown>)
      : {};
    const message = is.string(parameters[0])
      ? (parameters.shift() as string)
      : ``;
    logger[method](
      {
        context,
        ...data,
      },
      message,
      ...parameters,
    );
  }

  public static getLogger(): iLoggerCore {
    const store = storage.getStore();
    return store || AutoLogService.logger;
  }

  constructor(
    @Inject(INQUIRER) private parent: unknown,
    @Inject(ACTIVE_APPLICATION) private readonly activeApplication: string,
  ) {}

  #cached: string;
  #context: string;
  private contextId: string;

  public get level(): LogLevels {
    return AutoLogService.logger.level as LogLevels;
  }

  protected get context(): string {
    if (!this.#cached) {
      this.#cached ??= this.getContext();
      const split = this.#cached.includes(":")
        ? this.#cached
        : `:${this.#cached}`;
      const [project, provider] = split.split(":");
      if (project === this.activeApplication) {
        this.#cached = provider;
      }
    }
    return this.#cached;
  }

  /**
   * Available for if automated context setting doesn't work / isn't avaiable.
   * Those are the vast minority of use cases in the repo, so this definition is currently hidden (protected).
   * Set like this if actually needed
   *
   * ```typescript
   * logger['context'] = `${LIB_ALIENS.description}:SomethingIdentifying`;
   * ```
   */
  protected set context(value: string) {
    this.#context = value;
  }

  public debug(message: string, ...arguments_: unknown[]): void;
  public debug(
    object: object,
    message?: string,
    ...arguments_: unknown[]
  ): void;
  public debug(...arguments_: Parameters<LoggerFunction>): void {
    AutoLogService.call("debug", this.context, ...arguments_);
  }

  public error(message: string, ...arguments_: unknown[]): void;
  public error(
    object: object,
    message?: string,
    ...arguments_: unknown[]
  ): void;
  public error(...arguments_: Parameters<LoggerFunction>): void {
    AutoLogService.call("error", this.context, ...arguments_);
  }

  public fatal(message: string, ...arguments_: unknown[]): void;
  public fatal(
    object: object,
    message?: string,
    ...arguments_: unknown[]
  ): void;
  public fatal(...arguments_: Parameters<LoggerFunction>): void {
    AutoLogService.call("fatal", this.context, ...arguments_);
  }

  public info(message: string, ...arguments_: unknown[]): void;
  public info(object: object, message?: string, ...arguments_: unknown[]): void;
  public info(...arguments_: Parameters<LoggerFunction>): void {
    AutoLogService.call("info", this.context, ...arguments_);
  }

  /**
   * For edge case situations like:
   *
   *  - extreme early init
   *  - code locations where DI isn't available
   *
   * `@InjectLogger()` annotation is available for providers
   */
  public setContext(library: string, service: { name: string }): void {
    this.#context = `${library}:${service.name}`;
  }

  public trace(message: string, ...arguments_: unknown[]): void;
  public trace(
    object: object,
    message?: string,
    ...arguments_: unknown[]
  ): void;
  public trace(...arguments_: Parameters<LoggerFunction>): void {
    AutoLogService.call("trace", this.context, ...arguments_);
  }

  public warn(message: string, ...arguments_: unknown[]): void;
  public warn(object: object, message?: string, ...arguments_: unknown[]): void;
  public warn(...arguments_: Parameters<LoggerFunction>): void {
    AutoLogService.call("warn", this.context, ...arguments_);
  }

  private getContext(): string {
    if (this.#context) {
      return this.#context;
    }
    if (this.contextId) {
      return mappedContexts.get(this.contextId);
    }
    return GetLogContext(this.parent) || MISSING_CONTEXT;
  }
}
