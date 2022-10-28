export const LOGGER_LIBRARY = Symbol("LOGGER_LIBRARY");
export const MODULE_METADATA = Symbol("MODULE_METADATA");
export const LOG_CONTEXT = Symbol("LOG_CONTEXT");
export const TRACE_LOG = Symbol("TRACE_LOG");
export const DEBUG_LOG = Symbol("DEBUG_LOG");
export const WARNING_LOG = Symbol("WARNING_LOG");
export const MISSING_CONTEXT = "MISSING CONTEXT";
export const DESCRIPTOR = Symbol("DESCRIPTOR");

export const BOOTSTRAP_OPTIONS = Symbol("BOOTSTRAP_OPTIONS");
export const SKIP_CONFIG_INIT = Symbol("SKIP_CONFIG_INIT");
export const CONSUMES_CONFIG = Symbol("CONSUMES_CONFIG");
export const CONFIG_DEFAULTS = Symbol("CONFIG_DEFAULTS");

export const ACTIVE_APPLICATION = Symbol("ACTIVE_APPLICATION");

export const GetLogContext = (i: unknown): string =>
  i?.constructor[LOG_CONTEXT];
