import { ObjectBuilderOptions } from "../object-builder";

export type MagicHeader = string | [key: string, value: string];

export type ArrayBuilderOptions<VALUE extends object> = Omit<
  ObjectBuilderOptions<VALUE, never>,
  "cancel" | "current"
> & {
  /**
   * On cancel attempt for building an object, what message should be displayed?
   */
  cancelMessage?: string;
  /**
   * Current list of values
   */
  current?: VALUE[];
  /**
   * Default value to use when creating new rows
   */
  defaultRow?: VALUE;
  /**
   * Header message for top of the screen
   */
  header?: MagicHeader;
  /**
   * Use for generating menu labels.
   * Will be converted to string
   */
  labelPath: keyof VALUE;
  /**
   * Column header for menu widget
   */
  leftHeader?: string;
  /**
   * Column header for menu widget
   */
  rightHeader?: string;
  /**
   * Used for generating type labels
   */
  typePath?: keyof VALUE;
  /**
   * Left side column label
   */
  valuesLabel?: string;
};
