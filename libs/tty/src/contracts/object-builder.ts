import { MainMenuEntry } from "./keyboard";

export enum TABLE_CELL_TYPE {
  string = "string",
  boolean = "boolean",
  number = "number",
  enum = "enum",
  date = "date",
  list = "list",
}

export type ObjectBuilderDefault<T> = T | (() => T);

export type TableBuilderElement<VALUE = object> = {
  helpText?: string;
  name?: string;
  path: Extract<keyof VALUE, string>;
  format?<T>(value: T): string;
} & (
  | { default?: ObjectBuilderDefault<string>; type: "string" }
  | { default?: ObjectBuilderDefault<boolean>; type: "boolean" }
  | { default?: ObjectBuilderDefault<number>; type: "number" }
  | { default?: ObjectBuilderDefault<Date>; type: "date" }
  | {
      default?: ObjectBuilderDefault<string>;
      options: MainMenuEntry[];
      type: "enum";
    }
);

class BaseBuilderOptions<VALUE extends object, CANCEL extends unknown> {
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
  public cancel?:
    | CANCEL
    | ((
        cancelFunction: (cancelValue?: CANCEL) => void,
        confirm: (message?: string) => Promise<boolean>,
      ) => void | Promise<void>);
  public elements: TableBuilderElement<VALUE>[];
}

export class ArrayBuilderOptions<
  VALUE extends object,
  CANCEL extends unknown = never,
> extends BaseBuilderOptions<VALUE, CANCEL> {
  public current?: VALUE[];
  /**
   * Text that should appear the blue bar of the help text
   */
  public helpNotes?: string | ((current: VALUE[]) => string);
  public noRowsMessage?: string;
}

export class ObjectBuilderOptions<
  VALUE extends object,
  CANCEL extends unknown = never,
> extends BaseBuilderOptions<VALUE, CANCEL> {
  public current?: VALUE;
  /**
   * Text that should appear the blue bar of the help text
   */
  public helpNotes?: string | ((current: VALUE) => string);
}

export class TableBuilderOptions<
  VALUE extends object,
  CANCEL extends unknown = never,
> extends BaseBuilderOptions<VALUE, CANCEL> {
  public current?: VALUE | VALUE[];
  /**
   * Text that should appear the blue bar of the help text
   */
  public helpNotes?: string | ((current: VALUE | VALUE[]) => string);
  public mode?: "single" | "multi";
  public noRowsMessage?: string;
}

export class ColumnInfo {
  public maxWidth: number;
  public name: string;
  public path: string;
}

export enum OBJECT_BUILDER_ELEMENT {
  string = "string",
  boolean = "boolean",
  number = "number",
  enum = "enum",
  date = "date",
  list = "list",
}

export class ObjectBuilderEnum {
  public enum: string[];
}

export class ObjectBuilderElement {
  public name: string;
  public options?: ObjectBuilderEnum;
  public path: string;
  public type: OBJECT_BUILDER_ELEMENT;
}
