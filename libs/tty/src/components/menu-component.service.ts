/* eslint-disable sonarjs/no-duplicate-string */
import { CacheService } from "@digital-alchemy/boilerplate";
import {
  ARRAY_OFFSET,
  DOWN,
  EMPTY,
  FIRST,
  INCREMENT,
  INVERT_VALUE,
  is,
  LABEL,
  NONE,
  NOT_FOUND,
  PAIR,
  SINGLE,
  START,
  TitleCase,
  UP,
  VALUE,
} from "@digital-alchemy/utilities";
import { forwardRef, Inject } from "@nestjs/common";
import chalk from "chalk";
import dayjs from "dayjs";
import { get } from "object-path";
import { nextTick } from "process";

import {
  DirectCB,
  KeyModifiers,
  MainMenuEntry,
  MenuEntry,
  tKeyMap,
  TTY,
  TTYKeypressOptions,
} from "../contracts";
import { Component, iComponent } from "../decorators";
import { ansiMaxLength, ansiPadEnd, ansiStrip } from "../includes";
import {
  EnvironmentService,
  KeyboardManagerService,
  KeymapService,
  PromptEntry,
  ScreenService,
  TextRenderingService,
} from "../services";

type tMenuItem = [TTYKeypressOptions, string | DirectCB];
type PrefixArray = [TTYKeypressOptions, string];

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

function isAdvanced<VALUE = string>(
  options: KeymapOptions<VALUE>,
): options is AdvancedKeymap<VALUE> {
  return is.object(options);
}

export type KeyMap<VALUE = string> = Record<string, KeymapOptions<VALUE>>;
export type MenuPosition = ["left" | "right", number];
type MenuRestoreCacheData<VALUE = unknown> = {
  position: MenuPosition;
  value: VALUE;
};

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

export interface MenuComponentOptions<VALUE = unknown> {
  /**
   * Remove the page up / page down keypress options
   *
   * Doing this is mostly for UI aesthetics, removing a bit of extra help text for smaller menus.
   * Implies `hideSearch`
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
  /**
   * Disallow usage of fuzzy search
   */
  hideSearch?: boolean;
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

const DEFAULT_HEADER_PADDING = 4;

const SEARCH_KEYMAP: tKeyMap = new Map([
  [{ catchAll: true, powerUser: true }, "onSearchKeyPress"],
  [{ description: "select entry", key: "enter" }, "onEnd"],
  [{ description: "toggle find", key: "tab" }, "toggleFind"],
]);
const CACHE_KEY_RESTORE = (id: string) => `MENU_COMPONENT_RESTORE_${id}`;

interface LastMenuResultInfo<VALUE = unknown> {
  key?: {
    key: string;
    modifiers: KeyModifiers;
  };
  key_entry?: KeymapOptions<VALUE> | AdvancedKeymap;
  returned: VALUE;
  selected_entry: {
    entry: MainMenuEntry<VALUE>;
    index: number;
    side: "left" | "right";
  };
  type: "entry" | "keyboard";
}

type MenuProperties =
  | "alert"
  | "body"
  | "columnHeaders"
  | "header"
  | "divider"
  | "helpText"
  | "keybindings"
  | "notes";

const CONSTRUCTION_ORDER: MenuProperties[] = [
  "alert",
  "header",
  "columnHeaders",
  "body",
  "helpText",
  "divider",
  "notes",
  "keybindings",
];

const PRIORITY_ORDER: MenuProperties[] = [
  "body",
  "columnHeaders",
  "alert",
  "helpText",
  "header",
  "divider",
  "keybindings",
  "notes",
];

type ConstructionItem = {
  height: number;
  text: string;
  width: number;
};

type MenuConstruction = Partial<Record<MenuProperties, ConstructionItem>>;

/**
 * FIXME: This is currently a "best faith" attempt at row calculation.
 * It ignores that text can roll over the side, and create an extra row, which would not be seen here
 */
const CONSTRUCTION_PROP = (text: string): ConstructionItem => ({
  height: text.split(`\n`).length,
  text,
  width: ansiMaxLength(text),
});

type MenuModes = "find-navigate" | "select" | "find-input";

@Component({ type: "menu" })
export class MenuComponentService<VALUE = unknown | string>
  implements iComponent<MenuComponentOptions<VALUE>, VALUE>
{
  public static LAST_RESULT: LastMenuResultInfo<unknown>;

  constructor(
    @Inject(forwardRef(() => KeymapService))
    private readonly keymap: KeymapService,
    @Inject(forwardRef(() => TextRenderingService))
    private readonly text: TextRenderingService,
    private readonly keyboard: KeyboardManagerService,
    private readonly screen: ScreenService,
    private readonly environment: EnvironmentService,
    private readonly cache: CacheService,
  ) {}

  private callbackOutput = "";
  private callbackTimestamp = dayjs();
  private complete = false;
  private done: (type: VALUE) => void;
  private final = false;
  private headerPadding: number;
  private leftHeader: string;
  private mode: MenuModes = "select";
  private opt: MenuComponentOptions<VALUE>;
  private rightHeader: string;
  private searchCursor: number;
  private searchText = "";
  private selectedType: "left" | "right" = "right";
  private selectedValue: VALUE;
  private sort: boolean;
  private value: VALUE;

  private get notes(): string {
    const { helpNotes } = this.opt;
    if (is.string(helpNotes)) {
      return helpNotes;
    }
    if (is.array(helpNotes)) {
      return helpNotes.join(`\n`);
    }
    if (is.function(helpNotes)) {
      return helpNotes(this.value);
    }
    return `\n `;
  }

  public async configure(
    config: MenuComponentOptions<VALUE>,
    done: (type: VALUE) => void,
  ): Promise<void> {
    // * Reset from last run
    MenuComponentService.LAST_RESULT = undefined;
    this.searchText = "";
    this.searchCursor = START;
    this.complete = false;
    this.final = false;
    this.selectedValue = undefined;
    this.opt = config;

    // * Set up defaults in the config
    this.opt.left ??= [];
    this.opt.item ??= "actions";
    this.opt.right ??= [];
    this.opt.showHeaders ??= !is.empty(this.opt.left);
    this.opt.left.forEach(i => (i.type ??= ""));
    this.opt.right.forEach(i => (i.type ??= ""));
    this.opt.keyMap ??= {};

    this.done = done;
    const {
      leftHeader,
      restore,
      rightHeader,
      sort,
      left,
      right,
      headerPadding,
      value,
    } = config;

    // * Set local properties based on config
    this.headerPadding = headerPadding ?? DEFAULT_HEADER_PADDING;
    this.rightHeader = rightHeader || "Menu";
    this.leftHeader =
      leftHeader ||
      (!is.empty(left) && !is.empty(right) ? "Secondary" : "Menu");

    // Dev can force sorting either way
    // If types are provided on items, then sorting is enabled by default to properly group types
    // Otherwise, order in = order out
    this.sort =
      sort ??
      (left.some(({ type }) => !is.empty(type)) ||
        right.some(({ type }) => !is.empty(type)));

    // * Finial init
    await this.setValue(value, restore);
    this.detectSide();
    this.setKeymap();
  }

  /**
   * Entrypoint for rendering logic
   */
  public render(updateValue = false): void {
    // Complete = this widget must have `configure()` called prior to doing more rendering
    if (this.complete) {
      return;
    }
    // Final = this widget has returned a value,
    //   and wants to clean up the UI a bit before finishing
    if (this.final) {
      this.final = false;
      this.complete = true;
      return this.renderFinal();
    }
    // VVVVV Normal rendering work VVVVV
    if (this.mode === "select") {
      return this.renderSelect();
    }
    this.renderFind(updateValue);
  }

  /**
   * Run callbacks from the keyMap
   */
  protected async activateKeyMap(
    mixed: string,
    modifiers: KeyModifiers,
  ): Promise<boolean> {
    const { keyMap, keyMapCallback: callback } = this.opt;
    const entry = this.findKeyEntry(keyMap, mixed);
    if (!entry) {
      return false;
    }
    if (is.undefined(callback)) {
      this.selectedValue = this.value;
      this.value = TTY.GV(entry);
      MenuComponentService.LAST_RESULT = {
        key: {
          key: mixed,
          modifiers,
        },
        key_entry: entry,
        returned: this.value,
        selected_entry: undefined,
        type: "keyboard",
      };
      this.onEnd();
      return false;
    }
    const selectedItem = this.side(this.selectedType).find(
      ({ entry }) => TTY.GV(entry) === this.value,
    );
    const result = await (selectedItem
      ? callback(TTY.GV(entry) as string, [
          // Force a value entry to be present
          selectedItem.entry[LABEL],
          TTY.GV(selectedItem),
        ])
      : callback(TTY.GV(entry) as string, [undefined, undefined]));
    if (is.string(result)) {
      this.callbackOutput = result;
      this.callbackTimestamp = dayjs();
      return;
    }
    if (result) {
      this.selectedValue = this.value;
      this.value = TTY.GV(entry);
      MenuComponentService.LAST_RESULT = {
        key: {
          key: mixed,
          modifiers,
        },
        key_entry: entry,
        returned: this.value,
        selected_entry: undefined,
        type: "keyboard",
      };
      this.onEnd();
      return false;
    }
  }

  /**
   * Move the cursor to the bottom of the list
   */
  protected bottom(): void {
    const list = this.side(this.selectedType);
    this.value = TTY.GV(list[list.length - ARRAY_OFFSET].entry);
  }

  /**
   * Move the cursor around
   *
   * mode: "select"
   */
  protected navigateSearch(key: string): void {
    // * Grab list of items from current side
    const all = this.side(this.selectedType);
    let available = this.filterMenu(all);
    if (is.empty(available)) {
      available = all;
    }
    if (["pageup", "home"].includes(key)) {
      this.value = TTY.GV(available[START].entry);
      return;
    }
    if (["pagedown", "end"].includes(key)) {
      this.value = TTY.GV(available[available.length - ARRAY_OFFSET].entry);
      return;
    }
    const index = available.findIndex(
      ({ entry }) => TTY.GV(entry) === this.value,
    );
    if (index === NOT_FOUND) {
      this.value = TTY.GV(available[START].entry);
      return;
    }
    if (index === START && key === "up") {
      this.value = TTY.GV(available[available.length - ARRAY_OFFSET].entry);
      return;
    }
    if (index === available.length - ARRAY_OFFSET && key === "down") {
      this.value = TTY.GV(available[START].entry);
      return;
    }
    this.value = TTY.GV(
      available[key === "up" ? index - INCREMENT : index + INCREMENT].entry,
    );
  }

  /**
   * Move down 1 entry
   */
  protected next(): void {
    const list = this.side(this.selectedType);
    const index = list.findIndex(i => TTY.GV(i.entry) === this.value);
    if (index === NOT_FOUND) {
      this.value = TTY.GV(list[FIRST].entry);
      return;
    }
    if (index === list.length - ARRAY_OFFSET) {
      // Loop around
      this.value = TTY.GV(list[FIRST].entry);
      return;
    }
    this.value = TTY.GV(list[index + INCREMENT].entry);
  }

  /**
   * Terminate the editor
   */
  protected onEnd(): boolean {
    if (!this.done) {
      return;
    }
    const list = this.side(this.selectedType);
    const index = list.findIndex(
      entry => TTY.GV(entry) === this.selectedValue ?? this.value,
    );
    this.final = true;
    this.mode = "select";
    this.callbackOutput = "";
    this.done(this.value);
    MenuComponentService.LAST_RESULT ??= {
      returned: this.value,
      selected_entry: undefined,
      type: "entry",
    };
    MenuComponentService.LAST_RESULT.selected_entry = {
      entry: list[index],
      index,
      side: this.selectedType,
    };
    this.render();
    this.done = undefined;
    if (this.opt.restore) {
      nextTick(async () => {
        await this.cache.set(CACHE_KEY_RESTORE(this.opt.restore.id), {
          position: [this.selectedType, index],
          value: TTY.GV(list[index]) ?? this.value,
        } as MenuRestoreCacheData<VALUE>);
      });
    }
    return false;
  }

  /**
   * on left key press - attempt to move to left menu
   */
  protected onLeft(): void {
    if (is.empty(this.opt.left) || this.selectedType === "left") {
      return;
    }

    let [right, left] = [this.side("right"), this.side("left")];
    this.selectedType = "right";

    if (this.mode !== "select") {
      let availableRight = this.filterMenu(right);
      let availableLeft = this.filterMenu(left);
      availableRight = is.empty(availableRight) ? right : availableRight;
      availableLeft = is.empty(availableLeft) ? left : availableLeft;
      left = availableLeft;
      right = availableRight;
    }

    this.selectedType = "left";
    let current = right.findIndex(i => TTY.GV(i.entry) === this.value);
    if (current === NOT_FOUND) {
      current = START;
    }
    if (current > left.length) {
      current = left.length - ARRAY_OFFSET;
    }
    this.value =
      left.length - ARRAY_OFFSET < current
        ? TTY.GV(left[left.length - ARRAY_OFFSET].entry)
        : TTY.GV(left[current].entry);
  }

  /**
   * On right key press - attempt to move editor to right side
   */
  protected onRight(): void {
    if (is.empty(this.opt.right) || this.selectedType === "right") {
      return;
    }
    let [right, left] = [this.side("right"), this.side("left")];
    this.selectedType = "right";

    if (this.mode !== "select") {
      let availableRight = this.filterMenu(right);
      let availableLeft = this.filterMenu(left);
      availableRight = is.empty(availableRight) ? right : availableRight;
      availableLeft = is.empty(availableLeft) ? left : availableLeft;
      left = availableLeft;
      right = availableRight;
    }

    let current = left.findIndex(i => TTY.GV(i.entry) === this.value);
    if (current === NOT_FOUND) {
      current = START;
    }
    if (current > right.length) {
      current = right.length - ARRAY_OFFSET;
    }
    this.value =
      right.length - ARRAY_OFFSET < current
        ? TTY.GV(right[right.length - ARRAY_OFFSET].entry)
        : TTY.GV(right[current].entry);
  }

  protected onSearchFindInputKeyPress(key: string) {
    const searchLength = this.searchText.length;
    switch (key) {
      case "left":
        this.searchCursor = Math.max(START, this.searchCursor - INCREMENT);
        this.render(true);
        return;
      case "right":
        this.searchCursor = Math.min(
          searchLength,
          this.searchCursor + INCREMENT,
        );
        this.render(true);
        return;
      case "end":
        this.searchCursor = searchLength;
        this.render(true);
        return;
      case "home":
        this.searchCursor = START;
        this.render(true);
        return;
      case "pagedown":
      case "down":
        this.mode = "find-navigate";
        this.render(true);
        return;
      case "backspace":
        if (this.searchCursor === START) {
          return;
        }
        this.searchText = [...this.searchText]
          .filter((char, index) => index !== this.searchCursor - ARRAY_OFFSET)
          .join("");
        this.searchCursor = Math.max(START, this.searchCursor - INCREMENT);
        this.render(true);
        return;
      case "delete":
        // no need for cursor adjustments
        this.searchText = [...this.searchText]
          .filter((char, index) => index !== this.searchCursor)
          .join("");
        this.render(true);
        return;
      case "space":
        key = " ";
      // fall through
      default:
        if (key.length > SINGLE) {
          return;
        }
        this.searchText = [
          this.searchText.slice(START, this.searchCursor),
          key,
          this.searchText.slice(this.searchCursor),
        ].join("");
        this.searchCursor++;
        this.render(true);
    }
  }

  /**
   * Key handler for widget while in search mode
   */
  protected onSearchKeyPress(key: string): boolean {
    // ? Everywhere actions
    if (key === "escape") {
      // * Clear search text
      this.searchText = "";
      this.searchCursor = START;
      this.render(true);
      return false;
    }
    if (this.mode === "find-input") {
      this.onSearchFindInputKeyPress(key);
      return false;
    }
    const all = this.side(this.selectedType);
    let available = this.filterMenu(all);
    if (is.empty(available)) {
      available = all;
    }
    const index = available.findIndex(
      ({ entry }) => TTY.GV(entry) === this.value,
    );
    if (key === "pageup" && index == START) {
      this.mode = "find-input";
      this.render(true);
      return false;
    }
    switch (key) {
      case "backspace":
        // * Back
        this.searchText = this.searchText.slice(
          START,
          ARRAY_OFFSET * INVERT_VALUE,
        );
        this.render(true);
        return false;
      case "up":
      case "down":
      case "home":
      case "pageup":
      case "end":
      case "pagedown":
        this.navigateSearch(key);
        return;
      case "space":
        this.searchText += " ";
        this.render(true);
        return false;
      case "left":
        this.selectedType = "left";

        this.render(true);
        return false;
      case "right":
        this.selectedType = "right";
        this.render(true);
        return false;
    }
    if (key.length > SINGLE) {
      // These don't currently render in the help
      // if (!is.undefined(this.opt.keyMap[key])) {
      //   this.value = TTY.GV(this.opt.keyMap[key]);
      //   this.onEnd();
      // }
      return;
    }
    this.searchText += key;
    this.searchCursor = this.searchText.length;
    this.render(true);
    return false;
  }

  /**
   * Attempt to move up 1 item in the active list
   */
  protected previous(): void {
    const list = this.side(this.selectedType);
    const index = list.findIndex(i => TTY.GV(i.entry) === this.value);
    if (index === NOT_FOUND) {
      this.value = TTY.GV(list[FIRST].entry);
      return;
    }
    if (index === FIRST) {
      // Loop around
      this.value = TTY.GV(list[list.length - ARRAY_OFFSET].entry);
      return;
    }
    this.value = TTY.GV(list[index - INCREMENT].entry);
  }

  /**
   * Simple toggle function
   */
  protected toggleFind(): void {
    this.mode = this.mode === "select" ? "find-input" : "select";
    if (this.mode === "select") {
      this.detectSide();
      this.setKeymap();
    } else {
      this.keyboard.setKeyMap(this, SEARCH_KEYMAP);
    }
  }

  /**
   * Move cursor to the top of the current list
   */
  protected top(): void {
    const list = this.side(this.selectedType);
    this.value = TTY.GV(list[FIRST].entry);
  }

  /**
   * Run through the available sections that are available for rendering
   *
   * These are considered in order of priority.
   * If an item cannot be displayed, then it and all lower priority items will be skipped
   *
   * The goal is to maintain as much functionality as possible as the screen shrinks
   */
  private assembleMessage(construction: MenuConstruction): string {
    let height = this.environment.height;
    let caught = false;

    const assemble = new Set(
      PRIORITY_ORDER.filter(i => {
        if (caught || is.undefined(construction[i])) {
          return false;
        }
        height -= construction[i].height;
        if (height <= NONE) {
          caught = true;
          return false;
        }
        return true;
      }),
    );
    return CONSTRUCTION_ORDER.filter(i => assemble.has(i))
      .map(i => construction[i]?.text)
      .filter(i => is.string(i))
      .join(`\n`);
  }

  /**
   * Auto detect selectedType based on the current value
   */
  private detectSide(): void {
    const isLeftSide = this.side("left").some(
      i => TTY.GV(i.entry) === this.value,
    );
    this.selectedType = isLeftSide ? "left" : "right";
  }

  /**
   * Search mode - limit results based on the search text
   *
   * If requested, update the value value of this.value so it super definitely has a valid value
   * This can get lost if label and value were provided together
   *
   * ```json
   * { entry: ["combined"] }
   * ```
   */
  private filterMenu(
    data: MainMenuEntry<VALUE>[],
    updateValue = false,
  ): MainMenuEntry<VALUE>[] {
    const highlighted = this.text.fuzzyMenuSort(this.searchText, data);

    if (updateValue) {
      this.value = is.empty(highlighted)
        ? undefined
        : TTY.GV(highlighted[START].entry);
    }
    return highlighted;
  }

  private findKeyEntry(map: KeyMap<VALUE>, key: string) {
    if (map[key]) {
      return map[key];
    }
    const item = Object.entries(map).find(([, item]) => {
      if (is.array(item)) {
        return false;
      }
      const alias = item.alias ?? [];
      return alias.includes(key);
    });
    return item ? (item[VALUE] as AdvancedKeymap).entry : undefined;
  }

  /**
   * The final frame of a menu, informing what happened
   */
  private renderFinal() {
    const item = this.selectedEntry();
    let message = this.text.mergeHelp("", item);
    message += chalk` {cyan >} `;
    if (!is.empty(item?.icon)) {
      message += `${item.icon} `;
    }
    if (!is.empty(item?.type)) {
      message += chalk`{magenta.bold [${item.type}]} `;
    }

    message += chalk.blue`${item?.entry[LABEL]}`;
    this.screen.render(message);
  }

  /**
   * Rendering for search mode
   */
  private renderFind(updateValue = false): void {
    // * Component body
    const out = is.empty(this.opt.left)
      ? this.renderSide("right", false, updateValue).map(
          ({ entry }) => entry[LABEL],
        )
      : this.text.assemble(
          this.renderSide("left", false, updateValue).map(
            ({ entry }) => entry[LABEL],
          ),
          this.renderSide("right", false, updateValue).map(
            ({ entry }) => entry[LABEL],
          ),
        );

    let bgColor = "bgMagenta";
    if (this.mode === "find-input") {
      bgColor = is.empty(this.searchText) ? "bgBlue" : "bgCyan";
    }

    const search = this.text.searchBoxEditable({
      bgColor,
      cursor: this.mode === "find-input" ? this.searchCursor : undefined,
      padding: SINGLE,
      placeholder: "Type to filter",
      value: this.searchText,
      width: 100,
    });

    const message = this.text.mergeHelp(
      [...search, " ", ...out].join(`\n`),
      this.side(this.selectedType).find(
        ({ entry }) => TTY.GV(entry) === this.value,
      ),
    );
    this.screen.render(
      message,
      this.keymap.keymapHelp({ message, notes: this.notes }),
    );
  }

  /**
   * Rendering for standard keyboard navigation
   */
  private renderSelect() {
    const construction = {} as MenuConstruction;

    // * Very top text, error / response text
    if (
      !is.empty(this.callbackOutput) &&
      this.callbackTimestamp.isAfter(dayjs().subtract(PAIR, "second"))
    ) {
      construction.alert = CONSTRUCTION_PROP(this.callbackOutput + `\n\n`);
    }

    // * Header message
    if (!is.empty(this.opt.headerMessage)) {
      let headerMessage = this.opt.headerMessage;
      if (is.array(headerMessage)) {
        const stringArray = (headerMessage as string[]).every(i =>
          is.string(i),
        );
        if (stringArray) {
          headerMessage = headerMessage.join(`\n`);
        } else {
          const message = headerMessage as [key: string, value: string][];
          const max =
            ansiMaxLength(message.map(([label]) => label)) + INCREMENT;
          headerMessage = message
            .map(
              ([label, value]) =>
                chalk`{bold ${ansiPadEnd(label + ":", max)}} ${value}`,
            )
            .join(`\n`);
        }
      }
      construction.header = CONSTRUCTION_PROP(headerMessage + `\n\n`);
    }

    // * Component body
    const out = is.empty(this.opt.left)
      ? this.renderSide("right").map(({ entry }) => entry[LABEL])
      : this.text.assemble(
          this.renderSide("left").map(({ entry }) => entry[LABEL]),
          this.renderSide("right").map(({ entry }) => entry[LABEL]),
        );

    construction.columnHeaders = CONSTRUCTION_PROP(
      this.opt.showHeaders ? `\n  ${out.shift()}\n ` : `\n \n`,
    );
    construction.body = CONSTRUCTION_PROP(out.map(i => `  ${i}`).join(`\n`));

    const selectedItem = this.side(this.selectedType).find(
      ({ entry }) => TTY.GV(entry) === this.value,
    );

    // * Item help text
    if (!is.empty(selectedItem.helpText)) {
      construction.helpText = CONSTRUCTION_PROP(
        chalk`\n \n {blue.dim ?} ${this.text.helpFormat(
          selectedItem.helpText,
        )}`,
      );
    }

    construction.keybindings = CONSTRUCTION_PROP(this.renderSelectKeymap());

    const dividerWidth = this.environment.limitWidth(
      ...Object.keys(construction).map(
        // ? Single extra past the end for "padding"
        key => construction[key].width + INCREMENT,
      ),
    );

    construction.divider = CONSTRUCTION_PROP(
      chalk.blue.dim(`=`.repeat(dividerWidth)),
    );

    const message = this.assembleMessage(construction);
    this.screen.render(message);
  }

  /**
   *
   */
  private renderSelectKeymap() {
    const prefix = Object.keys(this.opt.keyMap).map(key => {
      let item = this.opt.keyMap[key];
      let highlight: HighlightCallbacks;
      const aliases: string[] = [];
      // ? Advanced keymaps = highlighting support
      if (isAdvanced(item as AdvancedKeymap)) {
        const advanced = item as AdvancedKeymap;
        highlight = is.string(advanced.highlight)
          ? {
              normal: chalk.green.dim,
              valueMatch: chalk.green.bold,
            }
          : advanced.highlight;
        item = advanced.entry;
        if (!is.empty(advanced.alias)) {
          aliases.push(...advanced.alias);
        }
      }
      if (!is.array(item)) {
        return undefined;
      }
      const [label] = item;
      return [
        {
          description: label + "  ",
          highlight,
          key: [key, ...aliases],
          matchValue: TTY.GV(item),
        },
        "",
      ];
    });
    return this.keymap.keymapHelp({
      current: this.value,
      onlyHelp: true,
      prefix: new Map(
        prefix.filter(item => !is.undefined(item)) as PrefixArray[],
      ),
    });
  }

  /**
   * Render a menu from a side
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private renderSide(
    side: "left" | "right" = this.selectedType,
    header = this.opt.showHeaders,
    updateValue = false,
  ): MainMenuEntry[] {
    const { out, maxType, maxLabel, menu } = this.renderSideSetup(
      side,
      updateValue,
    );

    let last = "";
    menu.forEach(item => {
      // * Grouping label
      let prefix = ansiPadEnd(item.type, maxType);
      // ? Optionally, make it fancy
      if (this.opt.titleTypes) {
        prefix = TitleCase(prefix);
      }
      // ? If it is the same as the previous one (above), then render blank space
      if (last === prefix) {
        prefix = " ".repeat(maxType);
      } else {
        // ? Hand off from one type to another
        // Insert a blank line in between
        // Hope everything is sorted
        if (last !== "" && this.mode === "select") {
          out.push({ entry: [" "] });
        }
        last = prefix;
        prefix = chalk(prefix);
      }

      // ? Where the cursor is
      const highlight =
        this.mode !== "find-input" && TTY.GV(item.entry) === this.value;
      const padded = ansiPadEnd(
        // ? If an icon exists, provide it and append a space
        (is.empty(item.icon) ? "" : `${item.icon} `) + item.entry[LABEL],
        maxLabel,
      );

      // ? When rendering the column with the cursor in it, add extra colors
      if (this.selectedType === side) {
        const color = highlight ? "bgCyanBright.black" : "white";
        out.push({
          ...item,
          entry: [
            // ? {grouping type in magenta} {item}
            chalk` {magenta.bold ${prefix}} {${color}  ${padded}}`,
            TTY.GV(item.entry),
          ],
        });
        return;
      }
      // ? Alternate column in boring gray
      out.push({
        ...item,
        entry: [
          chalk` {gray.bold ${prefix}}  {gray ${padded}}`,
          TTY.GV(item.entry),
        ],
      });
    });

    // ? This, annoyingly, is the easiest way to assemble headers
    const max = ansiMaxLength(...out.map(({ entry }) => entry[LABEL]));
    if (header) {
      out.unshift({
        entry: [
          chalk.bold.blue.dim(this.renderSideHeader(side, max)),
          Symbol("header_object"),
        ],
      });
    }

    return out;
  }

  private renderSideHeader(side: "left" | "right", max: number): string {
    const padding = " ".repeat(this.headerPadding);
    if (side === "left") {
      return `${this.leftHeader}${padding}`.padStart(max, " ");
    }
    return `${padding}${this.rightHeader}`.padEnd(max, " ");
  }

  private renderSideSetup(
    side: "left" | "right" = this.selectedType,
    updateValue = false,
  ) {
    const out: MainMenuEntry[] = [];
    let menu = this.side(side);
    if (this.mode !== "select") {
      menu = this.filterMenu(menu, updateValue);
    }
    const temporary = this.text.selectRange(menu, this.value);
    menu = temporary.map(i =>
      menu.find(({ entry }) => TTY.GV(i) === TTY.GV(entry)),
    );

    const maxType = ansiMaxLength(...menu.map(({ type }) => type));
    const maxLabel =
      ansiMaxLength(
        ...menu.map(
          ({ entry, icon }) =>
            entry[LABEL] + (is.empty(icon) ? "" : `${icon} `),
        ),
      ) + ARRAY_OFFSET;
    if (is.empty(menu) && !this.opt.keyOnly) {
      out.push({
        entry: [
          this.opt.emptyMessage ??
            chalk.bold` {yellowBright.inverse  No ${this.opt.item} to select from }`,
        ],
      });
    }
    return { maxLabel, maxType, menu, out };
  }

  private searchItems(
    findValue: VALUE,
    restore: MenuRestore,
  ): MainMenuEntry<string | VALUE> {
    return [...this.opt.left, ...this.opt.right].find(entry => {
      const local = TTY.GV(entry);
      const value = findValue;
      // quick filter for bad matches
      if (typeof value !== typeof local) {
        return false;
      }
      if (
        restore?.type === "value" &&
        !is.empty(restore?.idProperty) &&
        is.object(local) &&
        is.object(value)
      ) {
        // Multiple id paths may show up in mixed object type menus
        if (is.array(restore.idProperty)) {
          const out = restore.idProperty.find(id => {
            const a = get(local as object, id);
            const b = get(value as object, id);
            if (is.undefined(a) || is.undefined(b)) {
              return false;
            }
            return is.equal(a, b);
          });
          return !!out;
        }
        const a = get(value, restore?.idProperty);
        const b = get(local, restore?.idProperty);
        if (is.undefined(a) || is.undefined(b)) {
          return false;
        }
        return is.equal(a, b);
      }
      return is.equal(local, value);
    });
  }

  private selectedEntry(): MainMenuEntry {
    return [
      ...this.side("right"),
      ...this.side("left"),
      ...Object.values(this.opt.keyMap).map((entry: MenuEntry<VALUE>) => ({
        entry,
      })),
    ].find(item => TTY.GV(item.entry) === this.value);
  }

  private setKeymap(): void {
    // show if keyOnly, or falsy condensed
    const hidden = this.opt.keyOnly || this.opt.condensed;
    const PARTIAL_LIST: tMenuItem[] = [
      [{ catchAll: true, powerUser: true }, "activateKeyMap"],
      ...(this.opt.keyOnly
        ? []
        : ([
            [{ key: "down" }, "next"],
            [{ description: "select entry", key: "enter" }, "onEnd"],
            [{ key: "up" }, "previous"],
          ] as tMenuItem[])),

      [
        {
          key: ["end", "pagedown"],
          powerUser: hidden,
        },
        "bottom",
      ],
      [
        {
          key: ["home", "pageup"],
          powerUser: hidden,
        },
        "top",
      ],
    ];
    const LEFT_RIGHT: tMenuItem[] = [
      [{ description: "left", key: "left" }, "onLeft"],
      [{ description: "right", key: "right" }, "onRight"],
    ];
    const SEARCH: tMenuItem[] = [
      [{ description: "toggle find", key: "tab" }, "toggleFind"],
    ];

    const keymap = new Map([
      ...PARTIAL_LIST,
      ...(is.empty(this.opt.left) || is.empty(this.opt.right)
        ? []
        : LEFT_RIGHT),
      ...(this.opt.hideSearch || this.opt.keyOnly ? [] : SEARCH),
    ]);
    this.keyboard.setKeyMap(this, keymap);
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async setValue(value: VALUE, restore: MenuRestore): Promise<void> {
    this.value = undefined;

    // If the dev provided a value, then it takes priority
    if (!is.undefined(value)) {
      // Attempt to find the value in the list of options
      // If restore information is provided, then use that to help with comparisons
      const item = this.searchItems(value, restore);
      if (item) {
        // Translate value reference to the one off the entry
        // Makes comparisons easier inside the component
        this.value = TTY.GV(item);
        return;
      }
    }

    // If a restore id is available, attempt to get data from that
    if (!is.empty(restore?.id)) {
      const data = await this.cache.get<MenuRestoreCacheData<VALUE>>(
        CACHE_KEY_RESTORE(restore.id),
      );

      if (data) {
        // Position based value restoration
        if (restore.type === "position") {
          const [side] = data.position;
          let [, position] = data.position;
          const list = this.side(side);
          // Next closet item in the list
          if (!is.empty(list) && is.undefined(list[position])) {
            position = list.length - ARRAY_OFFSET;
          }
          // If the position does not actually exist, then normal default will be selected
          if (!is.undefined(list[position])) {
            this.value = TTY.GV(list[position]);
            return;
          }
        }
        // Value based restoration
        if (restore.type === "value") {
          const item = this.searchItems(data.value, restore);
          if (item) {
            this.value = TTY.GV(item);
            return;
          }
        }
      }
    }

    // Attempts to restore have failed, find a sane default
    let list = this.side("right");
    list = is.empty(list) ? this.side("left") : list;
    const top = list[FIRST];
    if (top) {
      this.value = TTY.GV(top);
    }

    // I guess value doesn't matter if there's no options?
  }

  /**
   * Retrieve the list of entries. Default is current side, aware of find mode
   *
   * Sorting logic:
   *  - Type sorting: priority set by highest level item inside type, then alphabetical
   *  - Items sorted within types, priority first, then ansi stripped label
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private side(side: "left" | "right"): MainMenuEntry<VALUE>[] {
    let temp = this.opt[side].map(item => [
      item,
      ansiStrip(item.entry[LABEL]).replace(new RegExp("[^A-Za-z0-9]", "g"), ""),
    ]) as [MainMenuEntry, string][];
    if (this.sort) {
      // Run through all the menu items, and find the highest priority for each type
      const maxPriority: Record<string, number> = {};
      temp.forEach(([{ priority = NONE, type }]) => {
        maxPriority[type] = Math.max(maxPriority[type] ?? NONE, priority);
      });
      // type priority > type alphabetical > item priority > item alphabetical
      temp = temp.sort(([a, aLabel], [b, bLabel]) => {
        if (a.type === b.type) {
          const aPriority = a.priority ?? EMPTY;
          const bPriority = b.priority ?? EMPTY;
          if (aPriority !== bPriority) {
            return aPriority < bPriority ? UP : DOWN;
          }
          return aLabel > bLabel ? UP : DOWN;
        }
        if (maxPriority[a.type] !== maxPriority[b.type]) {
          return maxPriority[a.type] < maxPriority[b.type] ? UP : DOWN;
        }
        if (a.type > b.type) {
          return UP;
        }
        return DOWN;
      });
    }
    return temp.map(([item]) => item as MainMenuEntry<VALUE>);
  }
}
