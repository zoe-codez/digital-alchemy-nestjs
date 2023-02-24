export type LogLevels = "info" | "debug" | "warn" | "trace" | "error" | "fatal";

type LoggerFunction =
  | ((message: string, ...arguments_: unknown[]) => void)
  | ((object: object, message?: string, ...arguments_: unknown[]) => void);

export interface iLogger extends iLoggerCore {
  level: LogLevels | string;

  debug(message: string, ...arguments_: unknown[]): void;
  debug(...arguments_: Parameters<LoggerFunction>): void;
  error(message: string, ...arguments_: unknown[]): void;
  error(...arguments_: Parameters<LoggerFunction>): void;
  fatal(message: string, ...arguments_: unknown[]): void;
  fatal(...arguments_: Parameters<LoggerFunction>): void;
  info(message: string, ...arguments_: unknown[]): void;
  info(...arguments_: Parameters<LoggerFunction>): void;
  trace(message: string, ...arguments_: unknown[]): void;
  trace(...arguments_: Parameters<LoggerFunction>): void;
  warn(message: string, ...arguments_: unknown[]): void;
  warn(...arguments_: Parameters<LoggerFunction>): void;
}

export interface iLoggerCore {
  level: LogLevels | string;

  debug(object: object, message?: string, ...arguments_: unknown[]): void;
  error(object: object, message?: string, ...arguments_: unknown[]): void;
  fatal(object: object, message?: string, ...arguments_: unknown[]): void;
  info(object: object, message?: string, ...arguments_: unknown[]): void;
  trace(object: object, message?: string, ...arguments_: unknown[]): void;
  warn(object: object, message?: string, ...arguments_: unknown[]): void;
}
