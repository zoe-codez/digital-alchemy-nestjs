export interface RepoMetadataDTO {
  configuration: Record<string, BaseConfig>;
}

export type SteggyConfigTypes =
  | "string"
  | "boolean"
  | "internal"
  | "number"
  | "record"
  | "string[]";

export class BaseConfig {
  /**
   * If no other values are provided, what value should be injected?
   * This ensures a value is always provided, and checks for undefined don't need to happen
   */
  public default?: unknown;
  /**
   * Short descriptive text so humans can understand why this exists.
   * Ideally should fit on a single line
   */
  public description?: string;
  /**
   * Refuse to boot if user provided value is not present.
   * This value cannot be defaulted, and it is absolutely required in order to do anything
   */
  public required?: boolean;

  public type: SteggyConfigTypes;
}

type StringFlags = "password" | "url";

export class StringConfig extends BaseConfig {
  public static isConfig(config: BaseConfig): config is StringConfig {
    return config.type === "string";
  }

  public default?: string;
  /**
   * If provided, the value **MUST** appear in this list or the application will refuse to boot.
   */
  public enum?: string[];
  /**
   * Currently no effect on runtime. Used as metadata for building `config-builder` app
   */
  public flags?: StringFlags[];
  public override type: SteggyConfigTypes = "string";
}

export class BooleanConfig extends BaseConfig {
  public static isConfig(config: BaseConfig): config is BooleanConfig {
    return config.type === "boolean";
  }
  public default?: boolean;
  public type: "boolean";
}

/**
 * For configurations that just can't be expressed any other way.
 * Make sure to add a helpful description on how to format the value,
 * because `config-builder` won't be able to help.
 *
 * This can be used to take in a complex json object, and forward the information to another library.
 *
 * TODO: JSON schema magic for validation / maybe config builder help
 */
export class InternalConfig extends BaseConfig {
  public static isConfig(config: BaseConfig): config is InternalConfig {
    return config.type === "internal";
  }

  public default?: unknown;
  public type: "internal";
}

export class NumberConfig extends BaseConfig {
  public static isConfig(config: BaseConfig): config is NumberConfig {
    return config.type === "number";
  }

  public default?: number;
  public type: "number";
}

/**
 * key/value pairs
 */
export class RecordConfig extends BaseConfig {
  public static isConfig(config: BaseConfig): config is RecordConfig {
    return config.type === "record";
  }

  public type: "record";
}

export class StringArrayConfig extends BaseConfig {
  public static isConfig(config: BaseConfig): config is StringArrayConfig {
    return config.type === "string[]";
  }
  public default?: string[];
  public type: "string[]";
}

/**
 * Used with config scanner
 */
export class ConfigDefinitionDTO {
  public application: string;
  public bootstrapOverrides?: AbstractConfig;
  public config: ConfigTypeDTO[];
}

export class ConfigTypeDTO {
  /**
   * Name of project
   */
  public library: string;
  /**
   * Description of a single config item as passed into the module
   */
  public metadata: BaseConfig;
  /**
   * Property name
   */
  public property: string;
}

/**
 * Top level configuration object
 *
 * Extends the global common config, adding a section for the top level application to chuck in data without affecting things
 * Also provides dedicated sections for libraries to store their own configuration options
 */
export class AbstractConfig {
  public application?: Record<string, unknown>;
  public libs?: Record<string, Record<string, unknown>>;
  private config?: string;
  private configs?: string[];
}
