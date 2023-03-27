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
  [{ description: "next", key: "down" }, "navigateSearch"],
  [{ description: "previous", key: "up" }, "navigateSearch"],
  [{ description: "bottom", key: ["end", "pagedown"] }, "navigateSearch"],
  [{ description: "top", key: ["home", "pageup"] }, "navigateSearch"],
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
    private readonly cache: CacheService,
  ) {}

  private callbackOutput = "";
  private callbackTimestamp = dayjs();
  private complete = false;
  private done: (type: VALUE) => void;
  private final = false;
  private headerPadding: number;
  private leftHeader: string;
  private mode: "find" | "select" = "select";
  private opt: MenuComponentOptions<VALUE>;
  private rightHeader: string;
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
    // Reset from last run
    MenuComponentService.LAST_RESULT = undefined;
    this.complete = false;
    this.final = false;
    this.selectedValue = undefined;
    this.opt = config;

    // Set up defaults in the config
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

    // Set local properties based on config
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

    // Finial init
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
    const selectedItem = this.side().find(
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
    const list = this.side();
    this.value = TTY.GV(list[list.length - ARRAY_OFFSET].entry);
  }

  /**
   * Move the cursor around
   */
  protected navigateSearch(key: string): void {
    const all = this.side();
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
    } else if (index === available.length - ARRAY_OFFSET && key === "down") {
      this.value = TTY.GV(available[START].entry);
    } else {
      this.value = TTY.GV(
        available[key === "up" ? index - INCREMENT : index + INCREMENT].entry,
      );
    }
  }

  /**
   * Move down 1 entry
   */
  protected next(): void {
    const list = this.side();
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

  protected numberSelect(mixed: string): boolean {
    const list = this.side();
    const item = list[Number(is.empty(mixed) ? "1" : mixed) - ARRAY_OFFSET];
    const entry = item?.entry;
    this.value = entry ? TTY.GV(entry) : this.value;
    return true;
  }

  /**
   * Terminate the editor
   */
  protected onEnd(): boolean {
    if (!this.done) {
      return;
    }
    const list = this.side();
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
    const [right, left] = [this.side("right"), this.side("left")];
    if (is.empty(this.opt.left) || this.selectedType === "left") {
      return;
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
    if (this.selectedType === "right") {
      return;
    }
    const [right, left] = [this.side("right"), this.side("left")];
    this.selectedType = "right";
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

  /**
   * Key handler for widget while in search mode
   */
  protected onSearchKeyPress(key: string): boolean {
    if (key === "backspace") {
      this.searchText = this.searchText.slice(
        START,
        ARRAY_OFFSET * INVERT_VALUE,
      );
      this.render(true);
      return false;
    }
    if (["up", "down", "home", "pageup", "end", "pagedown"].includes(key)) {
      this.navigateSearch(key);
    }
    if (key === "space") {
      this.searchText += " ";
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
    this.render(true);
    return false;
  }

  /**
   * Attempt to move up 1 item in the active list
   */
  protected previous(): void {
    const list = this.side();
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
    this.mode = this.mode === "find" ? "select" : "find";
    if (this.mode === "select") {
      this.detectSide();
      this.setKeymap();
    } else {
      this.searchText = "";
      this.keyboard.setKeyMap(this, SEARCH_KEYMAP);
    }
  }

  /**
   * Move cursor to the top of the current list
   */
  protected top(): void {
    const list = this.side();
    this.value = TTY.GV(list[FIRST].entry);
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
    const rendered = this.renderSide(undefined, false, updateValue);
    const message = this.text.mergeHelp(
      [
        ...this.text.searchBox(this.searchText),
        ...rendered.map(({ entry }) => entry[LABEL]),
      ].join(`\n`),
      rendered.find(i => TTY.GV(i.entry) === this.value),
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
    let message = "";

    // * Very top text, error / response text
    if (
      !is.empty(this.callbackOutput) &&
      this.callbackTimestamp.isAfter(dayjs().subtract(PAIR, "second"))
    ) {
      message += this.callbackOutput + `\n\n`;
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
      message += headerMessage + `\n\n`;
    }

    // * Component body
    const out = is.empty(this.opt.left)
      ? this.renderSide("right").map(({ entry }) => entry[LABEL])
      : this.text.assemble(
          this.renderSide("left").map(({ entry }) => entry[LABEL]),
          this.renderSide("right").map(({ entry }) => entry[LABEL]),
        );
    if (this.opt.showHeaders) {
      out[FIRST] = `\n  ${out[FIRST]}\n `;
    } else {
      message += `\n \n`;
    }
    message += out.map(i => `  ${i}`).join(`\n`);
    const selectedItem = this.side().find(
      ({ entry }) => TTY.GV(entry) === this.value,
    );

    // * Item help text
    message = this.text.mergeHelp(message, selectedItem);
    const keymap = this.renderSelectKeymap(message);

    // * Final render
    this.screen.render(message, keymap);
  }

  /**
   *
   */
  private renderSelectKeymap(message: string) {
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
      message,
      notes: this.notes,
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
    // TODO: Track down offset issue that forces this entry to be required
    const out: MainMenuEntry[] = [{ entry: [""] }];
    let menu = this.side(side);
    if (this.mode === "find" && !is.empty(this.searchText)) {
      menu = this.filterMenu(menu, updateValue);
    }
    const temporary = this.text.selectRange(menu, this.value);
    menu = temporary.map(i =>
      menu.find(({ entry }) => TTY.GV(i) === TTY.GV(entry)),
    );

    const maxType = ansiMaxLength(...menu.map(({ type }) => type));
    let last = "";
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
    menu.forEach(item => {
      let prefix = ansiPadEnd(item.type, maxType);
      if (this.opt.titleTypes) {
        prefix = TitleCase(prefix);
      }
      if (last === prefix) {
        prefix = chalk("".padEnd(maxType, " "));
      } else {
        if (last !== "" && this.mode !== "find") {
          out.push({ entry: [" "] });
        }
        last = prefix;
        prefix = chalk(prefix);
      }
      if (this.mode === "find") {
        prefix = ``;
      }
      const inverse = TTY.GV(item.entry) === this.value;
      const padded = ansiPadEnd(
        (is.empty(item.icon) ? "" : `${item.icon} `) + item.entry[LABEL],
        maxLabel,
      );
      if (this.selectedType === side) {
        out.push({
          ...item,
          entry: [
            chalk` {magenta.bold ${prefix}} {${
              inverse ? "bgCyanBright.black" : "white"
            }  ${padded}}`,
            TTY.GV(item.entry),
          ],
        });
        return;
      }
      out.push({
        ...item,
        entry: [chalk` {gray ${prefix}  {gray ${padded}}}`, TTY.GV(item.entry)],
      });
    });
    const max = ansiMaxLength(...out.map(({ entry }) => entry[LABEL]));
    if (header) {
      out[FIRST].entry[LABEL] =
        side === "left"
          ? chalk.bold.blue.dim(
              `${this.leftHeader}${"".padEnd(
                this.headerPadding,
                " ",
              )}`.padStart(max, " "),
            )
          : chalk.bold.blue.dim(
              `${"".padEnd(this.headerPadding, " ")}${this.rightHeader}`.padEnd(
                max,
                " ",
              ),
            );
    } else {
      out.shift();
    }
    return out;
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
            [
              {
                description: "select item",
                key: [..."0123456789"],
                powerUser: true,
              },
              "numberSelect",
            ],
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
  private side(
    side: "left" | "right" = this.selectedType,
    noRecurse = false,
  ): MainMenuEntry<VALUE>[] {
    if (this.mode === "find" && !noRecurse) {
      return [...this.side("right", true), ...this.side("left", true)];
    }
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
