import { Get } from "type-fest";

import { MainMenuEntry } from "./keyboard";

// * <Column Definitions>
/**
 * This value is used as default if current value is undefined
 */
export type ObjectBuilderDefault<PROP_DEFAULT, CURRENT extends object> =
  | PROP_DEFAULT
  | ((current: CURRENT) => PROP_DEFAULT);

export type TableBuilderElement<
  VALUE extends object = object,
  PATH extends Extract<keyof VALUE, string> = Extract<keyof VALUE, string>,
> = {
  /**
   * Help text will be displayed above the blue bar
   */
  helpText?: string | string[];
  /**
   * return true to hide the property
   *
   * When object builder sanitize is set to "visible-paths", this can be used to affect the generated data
   */
  hidden?: (value: VALUE) => boolean;
  name?: string;
  path: PATH;
  format?<T>(value: T): string;
} & (
  | { default?: ObjectBuilderDefault<string, VALUE>; type: "string" }
  | { default?: ObjectBuilderDefault<boolean, VALUE>; type: "boolean" }
  | { default?: ObjectBuilderDefault<number, VALUE>; type: "number" }
  | { default?: ObjectBuilderDefault<Date, VALUE>; type: "date" }
  | {
      default?: ObjectBuilderDefault<Get<VALUE, PATH>, VALUE>;
      options: MainMenuEntry<Get<VALUE, PATH>>[];
      type: "pick-one";
    }
  | {
      default?: ObjectBuilderDefault<Get<VALUE, PATH>[], VALUE>;
      options: MainMenuEntry<Get<VALUE, PATH>>[];
      type: "pick-many";
    }
);
// * </Column Definitions>

// * <Send Message>
export type ObjectBuilderMessagePositions =
  | "above-bar"
  | "below-bar"
  | "header-append"
  | "header-prepend"
  | "header-replace";

export type ObjectBuilderSendMessageOptions = {
  /**
   * Immediately perform a render when timeout expires.
   * If false, text will persist until next render call (usually a user interaction, unless you got creative).
   *
   * > default = `false`
   */
  immediateClear?: boolean;
  /**
   * Text to show
   */
  message: string;
  /**
   * > default: `"below-bar"`
   */
  position?: ObjectBuilderMessagePositions;
  /**
   * > default: `3` (seconds)
   */
  timeout?: number;
};

export type ObjectBuilderSendMessage = (
  options: ObjectBuilderSendMessageOptions,
) => void;
// * </Send Message>

// * <Validate>
export type BuilderValidateOptions<VALUE extends object> = {
  /**
   * Prompt the user for confirmation with a specific string
   */
  confirm: (message?: string) => Promise<boolean>;
  /**
   * Beware of unintentionally mutating this data
   */
  current: VALUE;
  /**
   * Does not consider visibility
   */
  dirtyProperties: (keyof VALUE)[];
  /**
   * Beware of unintentionally mutating this
   *
   * Object builder internally works on a cloned object
   */
  original: VALUE;
  /**
   * Display a message to the user
   * Generic sort of use, maybe for validation?
   *
   * Timeout is in seconds, default = `3`
   *
   * > Text is cleared on user interaction
   */
  sendMessage: ObjectBuilderSendMessage;
};
// * </Validate>

// * <Cancel>
export type BuilderCancelOptions<
  VALUE extends object,
  CANCEL extends unknown = never,
> = {
  /**
   * If run, builder will exit.
   *
   * Can provide a value to the method to have that value returned as the return result.
   * If no value is provided to this method, the original value for the object will used as the return result.
   */
  cancelFunction: (cancelValue?: CANCEL) => void;
  /**
   * Prompt the user for confirmation with a specific string
   */
  confirm: (message?: string) => Promise<boolean>;
  /**
   * Beware of unintentionally mutating this data
   */
  current: VALUE;
  /**
   * Does not consider visibility
   */
  dirtyProperties: (keyof VALUE)[];
  /**
   * Beware of unintentionally mutating this
   *
   * Object builder internally works on a cloned object
   */
  original: VALUE;
  /**
   * Display a message to the user
   * Generic sort of use, maybe for validation?
   *
   * Timeout is in seconds, default = `3`
   *
   * > Text is cleared on user interaction
   */
  sendMessage: ObjectBuilderSendMessage;
};

type BaseBuilderCancel<VALUE extends object, CANCEL extends unknown = never> = (
  options: BuilderCancelOptions<VALUE, CANCEL>,
) => void | Promise<void>;
// * </Cancel>

// * <Builder options>
export type ObjectBuilderOptions<
  VALUE extends object,
  CANCEL extends unknown = never,
> = {
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
   * ## other non-undefined valueS
   *
   * Value will be returned immediately when a cancel attempt is made
   */
  cancel?: CANCEL | BaseBuilderCancel<VALUE, CANCEL>;

  /**
   * The default value to use.
   * This object will not be mutated by internal workflows, a new object will be returned.
   *
   * **OBJECT WILL BE CLONED: NO RECURSION**
   */
  current?: VALUE;

  /**
   * Descriptions for how the object should be constructed.
   * Rendered as 2 column table, with no sorting applied.
   */
  elements: TableBuilderElement<VALUE>[];

  /**
   * Text that appears above the builder table
   */
  headerMessage?: string | ((current: VALUE) => string);

  /**
   * Text that appears below the blue bar separator, and above the keymap
   *
   * Element level help text is displayed above bar
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
   * ## (default) defined paths
   *
   * all properties passed in pas part of elements will be returned
   */
  sanitize?: "none" | "visible-paths" | "defined-paths";

  /**
   * On normal exit attempt, run method to perform validation.
   * Ultimately must return true (pass / return result) or false (fail / continue edit).
   */
  validate?: (
    options: BuilderValidateOptions<VALUE>,
  ) => Promise<boolean> | boolean;
};
// * </Builder options>
