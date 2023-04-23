export const LOGGER_LIBRARY = Symbol.for("LOGGER_LIBRARY");
export const MODULE_METADATA = Symbol.for("MODULE_METADATA");
export const LOG_CONTEXT = Symbol.for("LOG_CONTEXT");
export const TRACE_LOG = Symbol.for("TRACE_LOG");
export const DEBUG_LOG = Symbol.for("DEBUG_LOG");
export const WARNING_LOG = Symbol.for("WARNING_LOG");
export const MISSING_CONTEXT = "MISSING CONTEXT";
export const DESCRIPTOR = Symbol.for("DESCRIPTOR");

export const BOOTSTRAP_OPTIONS = Symbol.for("BOOTSTRAP_OPTIONS");
export const SKIP_CONFIG_INIT = Symbol.for("SKIP_CONFIG_INIT");
export const CONSUMES_CONFIG = Symbol.for("CONSUMES_CONFIG");
export const CONFIG_DEFAULTS = Symbol.for("CONFIG_DEFAULTS");

export const ACTIVE_APPLICATION = Symbol.for("ACTIVE_APPLICATION");

/**
 * Retrieve a log context from a provider.
 */
export const GetLogContext = (i: unknown, application = ""): string => {
  const context: string = i?.constructor[LOG_CONTEXT] ?? i?.constructor.name;
  if (application !== "" && context.startsWith(application)) {
    return context.replace(application + ":", "");
  }
  return context;
};
