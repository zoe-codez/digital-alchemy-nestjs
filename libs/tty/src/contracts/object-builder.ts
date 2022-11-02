import { MainMenuEntry } from "./keyboard";

export enum TABLE_CELL_TYPE {
  string = "string",
  boolean = "boolean",
  number = "number",
  enum = "enum",
  enumarray = "enum-array",
  date = "date",
  list = "list",
}

export type ObjectBuilderDefault<T> = T | (() => T);

export type TableBuilderElement<VALUE = object> = {
  helpText?: string;
  /**
   * Only works with single object builder mode.
   */
  hidden?: (value: VALUE) => boolean;
  name?: string;
  path: Extract<keyof VALUE, string>;
  format?<T>(value: T): string;
} & (
  | { default?: ObjectBuilderDefault<string>; type: "string" }
  | { default?: ObjectBuilderDefault<boolean>; type: "boolean" }
  | { default?: ObjectBuilderDefault<number>; type: "number" }
  | { default?: ObjectBuilderDefault<Date>; type: "date" }
  | {
      default?: ObjectBuilderDefault<unknown>;
      options: MainMenuEntry[];
      type: "enum";
    }
  | {
      default?: ObjectBuilderDefault<unknown[]>;
      options: MainMenuEntry[];
      type: "enum-array";
    }
);

type BaseBuilderOptions<VALUE extends object, CANCEL extends unknown> = {
  /**
   * If provided, the builder will present a cancel option.
   *
   * ## Function value
   *
   * Attempts to cancel the builder will result in the function being called.
   * A cancel function will be provided as the argument.
   * If ran, the builder will cancel, returning the value provided or original default value if not
   * This can be done async
   *
   * A second method is also provided, which can be used to prompt the user for confirmation of the cancel.
   *
   * ## Any other non-undefined value
   *
   * Value will be returned immediately when a cancel attempt is made
   */
  cancel?:
    | CANCEL
    | ((
        cancelFunction: (cancelValue?: CANCEL) => void,
        confirm: (message?: string) => Promise<boolean>,
      ) => void | Promise<void>);
  elements: TableBuilderElement<VALUE>[];
};

export type ObjectBuilderOptions<
  VALUE extends object,
  CANCEL extends unknown = never,
> = BaseBuilderOptions<VALUE, CANCEL> & {
  current?: VALUE;
  /**
   * Text that should appear the blue bar of the help text
   */
  helpNotes?: string | ((current: VALUE) => string);
  /**
   * ## none
   *
   * Any data passed in as part of current values will be passed through
   *
   * ## visible paths
   *
   * only properties from visible properties will be returned
   *
   * ## defined paths
   *
   * all properties passed in pas part of elements will be returned
   */
  sanitize?: "none" | "visible-paths" | "defined-paths";
};

export type ColumnInfo = {
  maxWidth: number;
  name: string;
  path: string;
};

type BASIC_OBJECT_BUILDER_ELEMENT = "string" | "boolean" | "number" | "date";

export type ObjectBuilderElement = {
  name: string;
  path: string;
} & (
  | {
      type: BASIC_OBJECT_BUILDER_ELEMENT;
    }
  | {
      options: string[];
      type: "enum";
    }
  | {
      options: MainMenuEntry[];
      type: "list";
    }
);
