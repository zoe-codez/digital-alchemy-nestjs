import { forwardRef, Inject } from "@nestjs/common";
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
} from "@steggy/utilities";
import chalk from "chalk";
import dayjs from "dayjs";

import {
  DirectCB,
  MainMenuEntry,
  MenuEntry,
  tKeyMap,
  TTY,
  TTYKeypressOptions,
} from "../contracts";
import { Component, iComponent } from "../decorators";
import { ansiMaxLength, ansiPadEnd, ansiStrip, MergeHelp } from "../includes";
import {
  KeyboardManagerService,
  KeymapService,
  PromptEntry,
  ScreenService,
  TextRenderingService,
} from "../services";

type tMenuItem = [TTYKeypressOptions, string | DirectCB];

export type HighlightCallbacks = Record<
  "valueMatch" | "normal",
  (value: string) => string
>;

export type AdvancedKeymap<VALUE = string> = {
  entry: PromptEntry<VALUE>;
  highlight?: "auto" | HighlightCallbacks;
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

/**
 * - true to terminate menu
 * - false to silently block
 * - string to block w/ output
 */
export type MainMenuCB<T = unknown> = (
  action: string,
  /**
   * The currently selected value. For consistency, this will ALWAYS contain a value
   */
  value: MenuEntry<T>,
) => (string | boolean) | Promise<string | boolean>;

export interface MenuComponentOptions<T = unknown> {
  /**
   * Remove the page up / page down keypress options
   *
   * Doing this is mostly for UI aesthetics, removing a bit of extra help text for smaller menus.
   * Implies `hideSearch`
   */
  condensed?: boolean;
  /**
   * Static text to stick at the top of the component.
   *
   * If passed as array, each item is it's own line
   */
  headerMessage?: string | [string, string][];
  /**
   * Extra padding to shift the header over by
   */
  headerPadding?: number;
  /**
   * Text that should appear the blue bar of the help text
   */
  helpNotes?: string | ((selected: T | string) => string);
  /**
   * Disallow usage of fuzzy search
   */
  hideSearch?: boolean;
  item?: string;
  /**
   * Entries to activate via keybindings instead of navigation
   */
  keyMap?: KeyMap<T>;
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
  left?: MainMenuEntry<T | string>[];
  /**
   * Header to be placed directly above the menu entries in the left column
   */
  leftHeader?: string;
  /**
   * Entries to place in the right column.
   * If only using one column, right / left doesn't matter
   */
  right?: MainMenuEntry<T | string>[];
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
  showHelp?: boolean;

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
   * Default selected entry. Can be in either left or right list
   */
  value?: T;
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

@Component({ type: "menu" })
export class MenuComponentService<VALUE = unknown | string>
  implements iComponent<MenuComponentOptions, VALUE>
{
  constructor(
    @Inject(forwardRef(() => KeymapService))
    private readonly keymap: KeymapService,
    @Inject(forwardRef(() => TextRenderingService))
    private readonly textRender: TextRenderingService,
    private readonly keyboard: KeyboardManagerService,
    private readonly screen: ScreenService,
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
  private sort: boolean;
  private value: VALUE;
  private get notes(): string {
    const { helpNotes } = this.opt;
    if (is.string(helpNotes)) {
      return helpNotes;
    }
    if (is.function(helpNotes)) {
      return helpNotes(this.value);
    }
    return `\n `;
  }

  public configure(
    config: MenuComponentOptions<VALUE>,
    done: (type: VALUE) => void,
  ): void {
    this.opt = config;
    this.complete = false;
    this.final = false;
    // this.showHelp = this.opt.showHelp ?? true;
    this.opt.left ??= [];
    this.opt.item ??= "actions";
    this.opt.right ??= [];
    this.opt.showHeaders ??= !is.empty(this.opt.left);
    this.opt.left.forEach(i => (i.type ??= ""));
    this.opt.right.forEach(i => (i.type ??= ""));
    this.opt.keyMap ??= {};
    // This shouldn't need casting...
    this.value = this.opt.value as VALUE;
    this.headerPadding = this.opt.headerPadding ?? DEFAULT_HEADER_PADDING;
    this.rightHeader = this.opt.rightHeader || "Menu";
    this.leftHeader =
      this.opt.leftHeader ||
      (!is.empty(this.opt.left) && !is.empty(this.opt.right)
        ? "Secondary"
        : "Menu");
    this.sort =
      this.opt.sort ??
      (this.opt.left.some(({ type }) => !is.empty(type)) ||
        this.opt.right.some(({ type }) => !is.empty(type)));

    const current = TTY.GV(
      this.side("right")[START]?.entry ?? this.side("left")[START]?.entry,
    );
    this.value ??= current;
    this.detectSide();
    this.done = done;
    this.setKeymap();
    const contained = this.side().find(i => TTY.GV(i.entry) === this.value);
    if (!contained) {
      this.value = current;
    }
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
  protected async activateKeyMap(mixed: string): Promise<boolean> {
    const { keyMap, keyMapCallback: callback } = this.opt;
    if (is.undefined(keyMap[mixed])) {
      return false;
    }
    if (is.undefined(callback)) {
      this.value = TTY.GV(keyMap[mixed]);
      this.onEnd();
      return false;
    }
    const selectedItem = this.side().find(
      ({ entry }) => TTY.GV(entry) === this.value,
    );
    const result = await (!selectedItem
      ? callback(TTY.GV(keyMap[mixed]) as unknown as string, [
          undefined,
          undefined,
        ])
      : callback(TTY.GV(keyMap[mixed]) as unknown as string, [
          // Force a value entry to be present
          selectedItem.entry[LABEL],
          TTY.GV(selectedItem),
        ]));
    if (is.string(result)) {
      this.callbackOutput = result;
      this.callbackTimestamp = dayjs();
      return;
    }
    if (result) {
      this.value = TTY.GV(keyMap[mixed]);
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
    this.final = true;
    this.mode = "select";
    this.callbackOutput = "";
    this.done(this.value);
    this.render();
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
      if (!is.undefined(this.opt.keyMap[key])) {
        this.value = TTY.GV(this.opt.keyMap[key]);
        this.onEnd();
      }
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
    const highlighted = this.textRender.fuzzyMenuSort(this.searchText, data);

    if (updateValue) {
      this.value = is.empty(highlighted)
        ? undefined
        : TTY.GV(highlighted[START].entry);
    }
    return highlighted;
  }

  private renderFinal() {
    const item = this.selectedEntry();
    let message = MergeHelp("", item);
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
    const message = MergeHelp(
      [
        ...this.textRender.searchBox(this.searchText),
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
   * Rendering for while not in find mode
   */
  // eslint-disable-next-line radar/cognitive-complexity
  private renderSelect(extraContent?: string) {
    let message = "";

    if (
      !is.empty(this.callbackOutput) &&
      this.callbackTimestamp.isAfter(dayjs().subtract(PAIR, "second"))
    ) {
      message += this.callbackOutput + `\n\n`;
    }
    if (!is.empty(this.opt.headerMessage)) {
      let headerMessage = this.opt.headerMessage;
      if (Array.isArray(headerMessage)) {
        const max =
          ansiMaxLength(headerMessage.map(([label]) => label)) + INCREMENT;
        headerMessage = headerMessage
          .map(
            ([label, value]) =>
              chalk`{bold ${ansiPadEnd(label + ":", max)}} ${value}`,
          )
          .join(`\n`);
      }
      // const headerMessage = is.string(this.opt.headerMessage)
      //   ? this.opt.headerMessage
      //   : this.opt.headerMessage.map(([label,value]) => chalk``).join(`\n`);
      message += headerMessage + `\n\n`;
    }
    const out = !is.empty(this.opt.left)
      ? this.textRender.assemble(
          this.renderSide("left").map(({ entry }) => entry[LABEL]),
          this.renderSide("right").map(({ entry }) => entry[LABEL]),
        )
      : this.renderSide("right").map(({ entry }) => entry[LABEL]);
    if (this.opt.showHeaders) {
      out[FIRST] = `\n  ${out[FIRST]}\n `;
    } else {
      message += `\n \n`;
    }
    message += out.map(i => `  ${i}`).join(`\n`);
    const selectedItem = this.side().find(
      ({ entry }) => TTY.GV(entry) === this.value,
    );
    message = MergeHelp(message, selectedItem);
    this.screen.render(
      message,
      !is.empty(extraContent)
        ? extraContent
        : this.keymap.keymapHelp({
            current: this.value,
            message,
            notes: this.notes,
            prefix: new Map(
              Object.entries(this.opt.keyMap)
                .map(function ([description, item]: [
                  string,
                  KeymapOptions<VALUE>,
                ]): [TTYKeypressOptions, string] {
                  let highlight: HighlightCallbacks;
                  if (isAdvanced(item as AdvancedKeymap)) {
                    const advanced = item as AdvancedKeymap;
                    highlight = is.string(advanced.highlight)
                      ? {
                          normal: chalk.green.dim,
                          valueMatch: chalk.green.bold,
                        }
                      : advanced.highlight;
                    item = advanced.entry;
                  }
                  if (!Array.isArray(item)) {
                    return undefined;
                  }
                  const [label] = item;
                  return [
                    {
                      description: (label + "  ") as string,
                      highlight,
                      key: description,
                      matchValue: TTY.GV(item),
                    },
                    "",
                  ];
                })
                .filter(item => !is.undefined(item)),
            ),
          }),
    );
  }

  /**
   * Render a menu from a side
   */
  // eslint-disable-next-line radar/cognitive-complexity
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
    const temporary = this.textRender.selectRange(menu, this.value);
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
      if (side === "left") {
        out[FIRST].entry[LABEL] = chalk.bold.blue.dim(
          `${this.leftHeader}${"".padEnd(this.headerPadding, " ")}`.padStart(
            max,
            " ",
          ),
        );
      } else {
        out[FIRST].entry[LABEL] = chalk.bold.blue.dim(
          `${"".padEnd(this.headerPadding, " ")}${this.rightHeader}`.padEnd(
            max,
            " ",
          ),
        );
      }
    } else {
      out.shift();
    }
    return out;
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

  /**
   * Retrieve the list of entries. Default is current side, aware of find mode
   *
   * Sorting logic:
   *  - Type sorting: priority set by highest level item inside type, then alphabetical
   *  - Items sorted within types, priority first, then ansi stripped label
   */
  // eslint-disable-next-line radar/cognitive-complexity
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
