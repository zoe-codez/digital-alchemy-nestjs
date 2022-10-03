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

export class ArrayBuilderOptions<VALUE extends object> {
  public current?: VALUE[];
  public elements: TableBuilderElement<VALUE>[];
  public noRowsMessage?: string;
}

export class ObjectBuilderOptions<VALUE extends object> {
  public current?: VALUE;
  public elements: TableBuilderElement<VALUE>[];
}

export class TableBuilderOptions<VALUE extends object> {
  public current?: VALUE | VALUE[];
  public elements: TableBuilderElement<VALUE>[];
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
