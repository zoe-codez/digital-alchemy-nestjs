import {
  ARRAY_OFFSET,
  EMPTY,
  INCREMENT,
  INVERT_VALUE,
  is,
  SINGLE,
  START,
} from "@digital-alchemy/utilities";
import chalk from "chalk";

import { tKeyMap, TTYKeypressOptions } from "../contracts";
import { Editor, iBuilderEditor } from "../decorators";
import { ansiPadEnd, ansiStrip, ELLIPSES } from "../includes";
import {
  KeyboardManagerService,
  KeymapService,
  ScreenService,
  TextRenderingService,
} from "../services";

export interface NumberEditorRenderOptions {
  current?: number;
  /**
   * Text that should appear the blue bar of the help text
   */
  helpNotes?: string | ((current: number) => string);
  label?: string;
  locale?: boolean;
  max?: number;
  min?: number;
  placeholder?: string;
  width?: number;
}

const PADDING = 4;
const DEFAULT_PLACEHOLDER = "enter value";
const INTERNAL_PADDING = " ";
const KEYMAP: tKeyMap = new Map<TTYKeypressOptions, string>([
  [{ catchAll: true, powerUser: true }, "onKeyPress"],
  [{ description: "done", key: "enter" }, "onEnd"],
  [{ key: "escape" }, "clear"],
  [{ key: "f3" }, "reset"],
  [{ key: "f4" }, "cancel"],
  [{ key: "up" }, "increment"],
  [{ key: "down" }, "decrement"],
]);

@Editor({ type: "number" })
export class NumberEditorService
  implements iBuilderEditor<NumberEditorRenderOptions>
{
  constructor(
    private readonly keyboard: KeyboardManagerService,
    private readonly keymap: KeymapService,
    private readonly screen: ScreenService,
    private readonly textRendering: TextRenderingService,
  ) {}

  private complete = false;
  private cursor: number;
  private done: (type: number) => void;
  private opt: NumberEditorRenderOptions;
  private value: string;
  private get notes(): string {
    const { helpNotes } = this.opt;
    if (is.string(helpNotes)) {
      return helpNotes;
    }
    if (is.function(helpNotes)) {
      return helpNotes(Number(this.value));
    }
    return `\n `;
  }

  public configure(
    config: NumberEditorRenderOptions,
    done: (type: unknown) => void,
  ) {
    this.opt = config;
    this.complete = false;
    this.reset();
    this.done = done;
    this.cursor = this.value.length;
    this.keyboard.setKeyMap(this, KEYMAP);
  }

  public render(): void {
    if (this.complete) {
      this.screen.render(
        chalk`{green ? } {bold ${this.opt.label}} {gray ${Number(
          this.value,
        ).toLocaleString()}}`,
      );
      return;
    }
    if (is.empty(this.value)) {
      return this.renderBox("bgBlue");
    }
    return this.renderBox("bgWhite");
  }

  protected cancel(): void {
    this.reset();
    this.onEnd();
  }

  protected clear(): void {
    this.value = "";
  }

  protected decrement(): void {
    this.value = (Number(this.value) - INCREMENT).toString();
  }

  protected increment(): void {
    this.value = (Number(this.value) + INCREMENT).toString();
  }

  protected onEnd() {
    this.complete = true;
    this.render();
    this.done(Number(this.value));
    return false;
  }

  protected onKeyPress(key: string): void {
    const current = this.value;
    switch (key) {
      case "left":
        this.cursor = this.cursor <= START ? START : this.cursor - SINGLE;
        return;
      case "right":
        this.cursor =
          this.cursor >= this.value.length
            ? this.value.length
            : this.cursor + SINGLE;
        return;
      case ".":
        if (current.includes(".")) {
          return;
        }
        break;
      case "home":
        this.cursor = START;
        return;
      case "end":
        this.cursor = this.value.length;
        return;
      case "delete":
        this.value = [...this.value]
          .filter((char, index) => index !== this.cursor)
          .join("");
        // no need for cursor adjustments
        return;
      case "backspace":
        if (this.cursor === EMPTY) {
          return;
        }
        this.value = [...this.value]
          .filter((char, index) => index !== this.cursor - ARRAY_OFFSET)
          .join("");
        this.cursor--;
        return;
    }
    if ([...".1234567890"].includes(key)) {
      this.value = [
        this.value.slice(START, this.cursor),
        key,
        this.value.slice(this.cursor),
      ].join("");
      this.cursor++;
    }
  }

  protected reset(): void {
    this.value = (
      is.number(this.opt.current) ? this.opt.current : EMPTY
    ).toString();
  }

  private renderBox(bgColor: string): void {
    let value = is.empty(this.value)
      ? this.opt.placeholder ?? DEFAULT_PLACEHOLDER
      : this.value;
    const maxLength = this.opt.width - PADDING;
    const out: string[] = [];
    if (this.opt.label) {
      out.push(chalk`{green ? } ${this.opt.label}`);
    }

    const stripped = ansiStrip(value);
    let length = stripped.length;
    if (length > maxLength - ELLIPSES.length) {
      const update =
        ELLIPSES + stripped.slice((maxLength - ELLIPSES.length) * INVERT_VALUE);
      value = value.replace(stripped, update);
      length = update.length;
    }
    value =
      value === DEFAULT_PLACEHOLDER
        ? value
        : [
            value.slice(START, this.cursor),
            chalk.inverse(value[this.cursor] ?? " "),
            value.slice(this.cursor + SINGLE),
          ].join("");

    out.push(
      chalk[bgColor].black(
        ansiPadEnd(
          INTERNAL_PADDING + value + INTERNAL_PADDING,
          maxLength + PADDING,
        ),
      ),
    );
    const message = this.textRendering.pad(out.join(`\n`));
    this.screen.render(
      message,
      this.keymap.keymapHelp({
        message,
        notes: this.notes,
      }),
    );
  }
}
