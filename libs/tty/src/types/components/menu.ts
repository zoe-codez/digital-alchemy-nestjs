import { PromptEntry } from "../../services";
import { MainMenuEntry, MenuEntry } from "../keyboard";

export type HighlightCallbacks<VALUE = string> = {
  /**
   * Provide alternate highlighting logic.
   *
   * ## return boolean
   *
   * if `true`: use valueMatch highlight
   *
   * if `false`: use normal highlight
   *
   * ```typescript
   * {
   *   highlightMatch: ({ numberProperty }) => numberProperty > 50,
   *   normal: chalk.blue,
   *   valueMatch: chalk.yellow
   * }
   * ```
   *
   * ## return function
   *
   * ignore normal highlighting, use provided instead
   *
   * >  equivalent to other example
   *
   * ```typescript
   * {
   *   highlightMatch: ({ numberProperty }) => numberProperty > 50? chalk.yellow : chalk.blue,
   * }
   * ```
   */
  highlightMatch?: (
    value: VALUE,
  ) => boolean | ((description: string) => string);
  normal?: (description: string) => string;
  valueMatch?: (description: string) => string;
};

export type AdvancedKeymap<VALUE = string> = {
  alias?: string[];
  entry: PromptEntry<VALUE>;
  highlight?: "auto" | HighlightCallbacks<VALUE>;
};

export type KeymapOptions<VALUE = string> =
  | PromptEntry<VALUE>
  | AdvancedKeymap<VALUE>;

export type KeyMap<VALUE = string> = Record<string, KeymapOptions<VALUE>>;
export type MenuPosition = ["left" | "right", number];

export type MenuRestore = {
  id: string;
} & (
  | {
      // position?: MenuPosition;
      type: "position";
    }
  | {
      /**
       * When comparing objects, use the provided property to do comparisons instead of strictly comparing the entire object.
       */
      idProperty?: string | string[];
      type: "value";
    }
);

/**
 * - true to terminate menu
 * - false to silently block
 * - string to block w/ output
 */
export type MainMenuCB<VALUE = unknown> = (
  action: string,
  /**
   * The currently selected value. For consistency, this will ALWAYS contain a value
   */
  value: MenuEntry<VALUE>,
) => (string | boolean) | Promise<string | boolean>;

export type BaseSearchOptions = {
  /**
   * default: true
   */
  enabled?: boolean;
  /**
   * default: true
   */
  helpText?: boolean;
  /**
   * default: true
   */
  label?: boolean;
  /**
   * default: true
   */
  types?: boolean;
};

export type MenuDeepSearch<SEARCH extends object = object> = {
  /**
   * Only applies when values are passed as objects.
   * Fuzzy search will consider values
   */
  deep?: keyof SEARCH | (keyof SEARCH)[];
};

/**
 * pass false to disable search
 */
export type MenuSearchOptions<SEARCH extends unknown = unknown> =
  | false
  | (BaseSearchOptions &
      (SEARCH extends object ? MenuDeepSearch<SEARCH> : never));

export interface MenuComponentOptions<VALUE = unknown> {
  /**
   * Remove the page up / page down keypress options
   *
   * Doing this is mostly for UI aesthetics, removing a bit of extra help text for smaller menus.
   * Implies `search` = false
   */
  condensed?: boolean;
  /**
   * Specific text to display when there are no entries in the right column.
   * Best utilized when there is a dynamic quantity of rows
   */
  emptyMessage?: string;
  /**
   * Static text to stick at the top of the component.
   *
   * If passed as array, each item is it's own line. Intended for object printing
   */
  headerMessage?: string | string[] | [key: string, value: string][];
  /**
   * Extra padding to shift the header over by
   */
  headerPadding?: number;
  /**
   * Text that should appear the blue bar of the help text
   */
  helpNotes?: string | string[] | ((selected: VALUE | string) => string);
  item?: string;
  /**
   * Entries to activate via keybindings instead of navigation
   */
  keyMap?: KeyMap<VALUE>;
  /**
   * When provided, all keymap commands will be passed through this first.
   *
   * - `return true` to exit out of menu, returning keypress value
   * - `return string` to report back a status message to the user (for background operations), but not exit
   * - `return false` to ignore keypress
   *
   * ## Example
   *
   * ```typescript
   * {
   *   // value is always provided in this callback
   *   // even if the original menu item didn't explicitly define it
   *   keyMapCallback: (action, [label, value]) => {
   *     // don't get involved with other actions
   *     // switch statements work great here too
   *     if (action !== "delete") {
   *       return true;
   *     }
   *     // validation logic
   *     if (value.type !== "special") {
   *       return "Can only use this action on special types";
   *     }
   *     // pass id reference to higher scoped variable
   *     deleteId = value.id;
   *     return true;
   *   }
   * }
   * ```
   */
  keyMapCallback?: MainMenuCB;
  /**
   * Set to true if deliberately using the menu as a keyboard navigation tool only.
   * Hides keyboard navigation help entries, and warning related to no entries provided
   */
  keyOnly?: boolean;
  /**
   * Entries to place in the left column.
   * If only using one column, right / left doesn't matter
   */
  left?: MainMenuEntry<VALUE | string>[];
  /**
   * Header to be placed directly above the menu entries in the left column
   */
  leftHeader?: string;
  /**
   * Controls how the menu chooses the default selected value.
   *
   * If provided an ID, the menu will track the returned value, it's side, and sorted index.
   *
   * When another menu is spawned with the same ID, it can be asked to restore to the previous position, or attempt to track down the previously returned value and use that as the position.
   *
   * Note: strict matching is default, but
   */
  restore?: MenuRestore;
  /**
   * Entries to place in the right column.
   * If only using one column, right / left doesn't matter
   */
  right?: MainMenuEntry<VALUE | string>[];
  /**
   * Header to be placed directly above the menu entries in the right column
   */
  rightHeader?: string;
  search?: MenuSearchOptions;
  /**
   * Show menu entries without the column headers
   */
  showHeaders?: boolean;
  /**
   * Append the help text below menu
   */
  // showHelp?: boolean;
  /**
   * Automatically sort menu entries alphabetically by label
   */
  sort?: boolean;
  /**
   * Make menu entry group types prettier.
   *
   * Ex: "some-property" => "Some Property"
   */
  titleTypes?: boolean;
  /**
   * Default selected entry. Can be in either left or right list.
   *
   * Configure the `restore`
   */
  value?: VALUE;
}
