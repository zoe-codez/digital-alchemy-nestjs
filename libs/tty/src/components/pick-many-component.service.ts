import {
  ARRAY_OFFSET,
  DOWN,
  FIRST,
  INCREMENT,
  INVERT_VALUE,
  is,
  LABEL,
  NOT_FOUND,
  SINGLE,
  START,
  UP,
} from "@digital-alchemy/utilities";
import { forwardRef, Inject } from "@nestjs/common";
import chalk from "chalk";
import { nextTick } from "process";

import { Component, iComponent } from "../decorators";
import { ansiMaxLength, ansiPadEnd } from "../includes";
import {
  ApplicationManagerService,
  KeyboardManagerService,
  KeymapService,
  ScreenService,
  TextRenderingService,
} from "../services";
import {
  ListBuilderOptions,
  MainMenuEntry,
  TTYComponentKeymap,
  TTYKeypressOptions,
} from "../types";

const UNSORTABLE = new RegExp("[^A-Za-z0-9]", "g");

const KEYMAP_FIND: TTYComponentKeymap = new Map<TTYKeypressOptions, string>([
  [{ key: "backspace", powerUser: true }, "searchBack"],
  [{ description: "toggle selected", key: ["`", "f4"] }, "toggle"],
  [{ description: "current", key: "left" }, "onLeft"],
  [{ description: "toggle find", key: "tab" }, "toggleFind"],
  [{ description: "available", key: "right" }, "onRight"],
  [{ powerUser: true }, "searchAppend"],
  [
    {
      description: "navigate",
      key: ["up", "down", "home", "pageup", "end", "pagedown"],
    },
    "navigateSearch",
  ],
]);
const KEYMAP_NORMAL: TTYComponentKeymap = new Map([
  [{ key: "i" }, "invert"],
  [{ description: "select all", key: ["[", "a"] }, "selectAll"],
  [{ description: "select none", key: ["]", "n"] }, "selectNone"],
  [{ description: "toggle find", key: "tab" }, "toggleFind"],
  [{ description: "toggle selected", key: ["`", "f4", "space"] }, "toggle"],
  [{ key: "f12" }, "reset"],
  [{ key: "escape" }, "cancel"],
  [{ description: "done", key: "enter" }, "onEnd"],
  [{ description: "left", key: "left" }, "onLeft"],
  [{ description: "right", key: "right" }, "onRight"],
  [{ key: ["home", "pageup"] }, "top"],
  [{ key: ["end", "pagedown"] }, "bottom"],
  [{ key: "up" }, "previous"],
  [{ key: "down" }, "next"],
  [{ key: [..."0123456789"], powerUser: true }, "numericSelect"],
]);

/**
 * ## Pick many widget
 *
 * Renders 2 lists side by side.
 * One contains a source, one contains a list of selected values.
 */
@Component({ type: "pick-many" })
export class PickManyComponentService<VALUE = unknown>
  implements iComponent<ListBuilderOptions<VALUE>, VALUE>
{
  constructor(
    @Inject(forwardRef(() => KeymapService))
    private readonly keymap: KeymapService,
    @Inject(forwardRef(() => TextRenderingService))
    private readonly text: TextRenderingService,
    private readonly application: ApplicationManagerService,
    private readonly screen: ScreenService,
    private readonly keyboard: KeyboardManagerService,
  ) {}

  public value: VALUE;
  private complete = false;
  private current: MainMenuEntry<VALUE | string>[];
  private done: (type: VALUE[]) => void;
  private final = false;
  private mode: "find" | "select" = "select";
  private numericSelection = "";
  private opt: ListBuilderOptions<VALUE>;
  private searchText = "";
  private selectedType: "current" | "source" = "source";
  private source: MainMenuEntry<VALUE | string>[];

  public configure(
    options: ListBuilderOptions<VALUE>,
    done: (type: VALUE[]) => void,
  ): void {
    this.complete = false;
    this.final = false;
    this.done = done;
    this.opt = options;
    this.opt.source ??= [];
    this.opt.current ??= [];
    this.current = [...this.opt.current];
    this.source = [...this.opt.source];
    this.opt.items ??= `Items`;
    this.mode = "select";
    const items = this.side(is.empty(this.source) ? "current" : "source");
    this.value ??= is.GV(items[START]) as VALUE;
    this.detectSide();
    this.keyboard.setKeymap(this, KEYMAP_NORMAL);
  }

  public onEnd(): void {
    this.mode = "select";
    this.final = true;
    this.render();
    this.done(this.current.map(i => is.GV(i.entry) as VALUE));
  }

  public render(updateValue = false): void {
    this.application.reprintHeader();
    if (this.complete) {
      return;
    }
    const left = `Current ${this.opt.items}`;
    const right = `Available ${this.opt.items}`;
    const current = this.renderSide(
      "current",
      updateValue && this.selectedType === "current",
    );
    const source = this.renderSide(
      "source",
      updateValue && this.selectedType === "source",
    );
    const search = this.mode === "find" ? this.searchText : undefined;
    const message = this.text.assemble([current, source], {
      left,
      right,
      search,
    });
    if (this.final) {
      this.screen.render(chalk.blue("=".repeat(ansiMaxLength(message))));
      this.final = false;
      this.complete = true;
      return;
    }
    const list = this.side();
    const item = list.find(i => is.GV(i) === this.value);
    this.screen.render(
      this.text.mergeHelp(message.join(`\n`), item),
      this.keymap.keymapHelp({ message: message.join(`\n`) }),
    );
  }

  protected add(): void {
    nextTick(() => this.render());
    if (this.selectedType === "current") {
      return;
    }
    // retrieve source list (prior to removal)
    const source = this.side("source", false);

    // Move item to current list
    const item = this.source.find(
      item => is.GV(item.entry) === this.value,
    ) as MainMenuEntry<string>;
    this.current.push(item);
    // Remove from source
    this.source = this.source.filter(
      check => is.GV(check.entry) !== this.value,
    );

    // Find move item in original source list
    const index = source.findIndex(i => is.GV(i) === this.value);

    // If at bottom, move up one
    if (index === source.length - ARRAY_OFFSET) {
      // If only item, flip sides
      if (index === START) {
        this.selectedType = "current";
        return;
      }
      this.value = is.GV(source[index - INCREMENT]);
      return;
    }
    // If not bottom, move down one
    this.value = is.GV(source[index + INCREMENT]);
  }

  protected bottom(): void {
    const list = this.side();
    this.value = is.GV(list[list.length - ARRAY_OFFSET]);
    this.render();
  }

  protected cancel(): void {
    this.reset();
    this.onEnd();
  }

  protected invert(): void {
    const temporary = this.source;
    this.source = this.current;
    this.current = temporary;
    this.detectSide();
    this.render();
  }

  protected navigateSearch(key: string): void {
    nextTick(() => this.render());
    const all = this.side();
    let available = this.filterMenu(all);
    if (is.empty(available)) {
      available = all;
    }
    if (["pageup", "home"].includes(key)) {
      this.value = is.GV(available[START]);
      return;
    }
    if (["pagedown", "end"].includes(key)) {
      this.value = is.GV(available[available.length - ARRAY_OFFSET]);
      return;
    }
    const index = available.findIndex(entry => is.GV(entry) === this.value);
    if (index === NOT_FOUND) {
      this.value = is.GV(available[START]);
      return;
    }
    if (index === START && key === "up") {
      this.value = is.GV(available[available.length - ARRAY_OFFSET]);
    } else if (index === available.length - ARRAY_OFFSET && key === "down") {
      this.value = is.GV(available[START]);
    } else {
      this.value = is.GV(
        available[key === "up" ? index - INCREMENT : index + INCREMENT],
      );
    }
  }

  protected next(): void {
    nextTick(() => this.render());
    const list = this.side();
    const index = list.findIndex(i => is.GV(i) === this.value);
    if (index === NOT_FOUND) {
      this.value = is.GV(list[FIRST]);
      return;
    }
    if (index === list.length - ARRAY_OFFSET) {
      // Loop around
      this.value = is.GV(list[FIRST]);
      return;
    }
    this.value = is.GV(list[index + INCREMENT]);
  }

  protected numericSelect(mixed: string): void {
    this.numericSelection = mixed;
    const item =
      this.side()[
        Number(is.empty(this.numericSelection) ? "1" : this.numericSelection) -
          ARRAY_OFFSET
      ];
    this.value = is.object(item) ? is.GV(item) : this.value;
    this.render();
  }

  protected onLeft(): void {
    const [left, right] = [
      this.side("current", true),
      this.side("source", true),
    ];
    if (is.empty(left) || this.selectedType === "current") {
      return;
    }
    this.selectedType = "current";
    let current = right.findIndex(i => is.GV(i) === this.value);
    if (current === NOT_FOUND) {
      current = START;
    }
    if (current > left.length) {
      current = left.length - ARRAY_OFFSET;
    }
    this.value =
      left.length < current
        ? is.GV(left[left.length - ARRAY_OFFSET])
        : is.GV(left[current]);
    this.render();
  }

  protected onRight(): void {
    const [right, left] = [
      this.side("source", true),
      this.side("current", true),
    ];
    if (this.selectedType === "source" || is.empty(right)) {
      return;
    }
    this.selectedType = "source";
    let current = left.findIndex(i => is.GV(i) === this.value);
    if (current === NOT_FOUND) {
      current = START;
    }
    if (current > right.length) {
      current = right.length - ARRAY_OFFSET;
    }
    this.value =
      right.length - ARRAY_OFFSET < current
        ? is.GV(right[right.length - ARRAY_OFFSET])
        : is.GV(right[current]);
    this.render();
  }

  protected previous(): void {
    const list = this.side();
    const index = list.findIndex(i => is.GV(i) === this.value);
    if (index === NOT_FOUND) {
      this.value = is.GV(list[FIRST]);
      return;
    }
    if (index === FIRST) {
      // Loop around
      this.value = is.GV(list[list.length - ARRAY_OFFSET]);
      return;
    }
    this.value = is.GV(list[index - INCREMENT]);
    this.render();
  }

  protected reset(): void {
    this.current = [...this.opt.current];
    this.source = [...this.opt.source];
  }

  protected searchAppend(key: string): void {
    if ((key.length > SINGLE && key !== "space") || ["`"].includes(key)) {
      return;
    }
    this.searchText += key === "space" ? " " : key;
    if (is.empty(this.side())) {
      this.selectedType = this.selectedType === "source" ? "current" : "source";
    }
    this.render(true);
  }

  protected searchBack(): void {
    this.searchText = this.searchText.slice(START, ARRAY_OFFSET * INVERT_VALUE);
    this.render(true);
  }

  protected selectAll(): void {
    this.current = [...this.current, ...this.source];
    this.source = [];
    this.detectSide();
  }

  protected selectNone(): void {
    this.source = [...this.current, ...this.source];
    this.current = [];
    this.detectSide();
  }

  protected toggle(): void {
    if (this.selectedType === "current") {
      this.remove();
      return;
    }
    this.add();
  }

  protected toggleFind(): void {
    this.mode = this.mode === "find" ? "select" : "find";
    this.searchText = "";
    this.keyboard.setKeymap(
      this,
      this.mode === "find" ? KEYMAP_FIND : KEYMAP_NORMAL,
    );
  }

  protected top(): void {
    const list = this.side();
    this.value = is.GV(list[FIRST]);
  }

  private detectSide(): void {
    const isLeftSide = this.side("current").some(i => is.GV(i) === this.value);
    this.selectedType = isLeftSide ? "current" : "source";
  }

  private filterMenu(
    data: MainMenuEntry<VALUE>[],
    updateValue = false,
  ): MainMenuEntry<VALUE>[] {
    const highlighted = this.text.fuzzyMenuSort(this.searchText, data);
    if (is.empty(highlighted) || updateValue === false) {
      return highlighted;
    }
    this.value = is.GV(highlighted[START]);
    return highlighted;
  }

  private remove(): void {
    if (this.selectedType === "source") {
      return;
    }
    // retrieve current list (prior to removal)
    const current = this.side("current", false);

    // Move item to current list
    const item = this.current.find(
      ({ entry }) => is.GV(entry) === this.value,
    ) as MainMenuEntry<string>;
    this.source.push(item);
    // Remove from source
    this.current = this.current.filter(
      ({ entry }) => is.GV(entry) !== this.value,
    );

    // Find move item in original source list
    const index = current.findIndex(i => is.GV(i) === this.value);

    // If at bottom, move up one
    if (index === current.length - ARRAY_OFFSET) {
      // If only item, flip sides
      if (index === START) {
        this.selectedType = "current";
        return;
      }
      this.value = is.GV(current[index - INCREMENT]);
      return;
    }
    // If not bottom, move down one
    this.value = is.GV(current[index + INCREMENT]);
  }

  private renderSide(
    side: "current" | "source" = this.selectedType,
    updateValue = false,
  ): string[] {
    const out: string[] = [];
    let menu = this.side(side, true);
    if (this.mode === "find" && !is.empty(this.searchText)) {
      menu = this.filterMenu(this[side] as MainMenuEntry<VALUE>[], updateValue);
    }
    const maxLabel =
      ansiMaxLength(...menu.map(entry => entry.entry[LABEL])) + ARRAY_OFFSET;
    if (is.empty(menu)) {
      out.push(chalk.bold` {gray.inverse  List is empty } `);
    }
    menu.forEach(item => {
      const inverse = is.GV(item) === this.value;
      const padded = ansiPadEnd(item.entry[LABEL], maxLabel);
      if (this.selectedType === side) {
        out.push(
          chalk` {${inverse ? "bgCyanBright.black" : "white"}  ${padded} }`,
        );
        return;
      }
      out.push(chalk` {gray  ${padded} }`);
    });
    return out;
  }

  private side(
    side: "current" | "source" = this.selectedType,
    range = false,
  ): MainMenuEntry<VALUE>[] {
    if (range) {
      return this.text.selectRange(this.side(side, false), this.value);
    }
    if (this.mode === "find") {
      return this.text.fuzzyMenuSort<VALUE>(
        this.searchText,
        this[side] as MainMenuEntry<VALUE>[],
      );
    }
    return this[side].sort((a, b) => {
      return a.entry[LABEL].replaceAll(UNSORTABLE, "") >
        b.entry[LABEL].replaceAll(UNSORTABLE, "")
        ? UP
        : DOWN;
    }) as MainMenuEntry<VALUE>[];
  }
}
