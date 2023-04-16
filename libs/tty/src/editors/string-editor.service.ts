import { InjectConfig } from "@digital-alchemy/boilerplate";
import {
  ARRAY_OFFSET,
  EMPTY,
  INVERT_VALUE,
  is,
  SINGLE,
  START,
} from "@digital-alchemy/utilities";
import chalk from "chalk";

import { DEFAULT_PROMPT_WIDTH } from "../config";
import { Editor, iBuilderEditor } from "../decorators";
import { ansiPadEnd, ansiStrip, ELLIPSES } from "../includes";
import {
  KeyboardManagerService,
  KeymapService,
  ScreenService,
  TextRenderingService,
} from "../services";
import { KeyModifiers, tKeyMap, TTYKeypressOptions } from "../types";

export type StringEditorRenderOptions = {
  current?: string;
  label?: string;
  mask?: "hide" | "obfuscate";
  // maxLength?: number;
  // minLength?: number;
  placeholder?: string;
  // validate?: (value: string) => true | string;
  width?: number;
};

const DEFAULT_PLACEHOLDER = "enter value";
const INTERNAL_PADDING = " ";
const PADDING = 4;
const KEYMAP: tKeyMap = new Map<TTYKeypressOptions, string>([
  [{ catchAll: true, powerUser: true }, "onKeyPress"],
  [{ description: "done", key: "enter" }, "onEnd"],
  [{ key: "f3" }, "reset"],
  [{ key: "escape" }, "clear"],
  [{ key: "f4" }, "cancel"],
]);
const NO_CURSOR = -1;

@Editor({ type: "string" })
export class StringEditorService
  implements iBuilderEditor<StringEditorRenderOptions>
{
  constructor(
    private readonly keyboard: KeyboardManagerService,
    private readonly keymap: KeymapService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
    @InjectConfig(DEFAULT_PROMPT_WIDTH) private readonly defaultWidth: number,
  ) {}

  private complete = false;
  private config: StringEditorRenderOptions;
  private cursor: number;
  private done: (type: string) => void;
  private value: string;

  public configure(
    config: StringEditorRenderOptions,
    done: (type: unknown) => void,
  ) {
    config.width ??= this.defaultWidth;
    this.config = config;
    this.complete = false;
    this.value = this.config.current ?? "";
    this.done = done;
    this.keyboard.setKeyMap(this, KEYMAP);
    this.cursor = this.value.length;
    this.cursor = 24;
  }

  public render(): void {
    if (this.complete) {
      this.screen.render(
        chalk`{green ? } {bold ${this.config.label}} {gray ${this.value}}`,
      );
      return;
    }
    if (is.empty(this.value)) {
      return this.renderBox("bgBlue", NO_CURSOR);
    }
    return this.renderBox("bgWhite");
  }

  protected cancel(): void {
    this.value = this.config.current;
    this.onEnd();
  }

  protected clear(): void {
    this.value = ``;
    this.cursor = START;
  }

  protected onEnd() {
    this.complete = true;
    this.render();
    this.done(this.value);
    return false;
  }

  protected onKeyPress(key: string, { shift }: KeyModifiers) {
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
        if (shift) {
          return;
        }
        if (this.cursor === EMPTY) {
          return;
        }
        this.value = [...this.value]
          .filter((char, index) => index !== this.cursor - ARRAY_OFFSET)
          .join("");
        this.cursor--;
        return;
      case "space":
        key = " ";
        break;
    }
    if (key.length > SINGLE) {
      return;
    }
    const value = shift ? key.toUpperCase() : key;
    this.value = [
      this.value.slice(START, this.cursor),
      value,
      this.value.slice(this.cursor),
    ].join("");
    this.cursor++;
  }

  protected reset(): void {
    this.value = this.config.current;
    this.cursor = this.config.current.length;
  }

  private renderBox(bgColor: string, cursor = this.cursor): void {
    let value = is.empty(this.value)
      ? this.config.placeholder ?? DEFAULT_PLACEHOLDER
      : this.value;
    if (value !== DEFAULT_PLACEHOLDER) {
      if (this.config.mask === "hide") {
        value = "";
      } else if (this.config.mask === "obfuscate") {
        value = "*".repeat(value.length);
      }
    }
    const width = this.config.width - PADDING;
    this.screen.render(
      this.text
        .searchBoxEditable({
          bgColor,
          cursor,
          padding: PADDING,
          value,
          width,
        })
        .join("\n"),
    );
  }

  private renderBox2(bgColor: string): void {
    let value = is.empty(this.value)
      ? this.config.placeholder ?? DEFAULT_PLACEHOLDER
      : this.value;
    const maxLength = this.config.width - PADDING;
    const out: string[] = [];
    if (this.config.label) {
      out.push(chalk`{green ? } ${this.config.label}`);
    }
    const stripped = ansiStrip(value);
    let length = stripped.length;
    if (length > maxLength - ELLIPSES.length) {
      const update =
        ELLIPSES + stripped.slice((maxLength - ELLIPSES.length) * INVERT_VALUE);
      value = value.replace(stripped, update);
      length = update.length;
    }
    if (value !== DEFAULT_PLACEHOLDER) {
      if (this.config.mask === "hide") {
        value = "";
      } else {
        if (this.config.mask === "obfuscate") {
          value = "*".repeat(value.length);
        }
        value = [
          value.slice(START, this.cursor),
          chalk.inverse(value[this.cursor] ?? " "),
          value.slice(this.cursor + SINGLE),
        ].join("");
      }
    }
    out.push(
      chalk[bgColor].black(
        ansiPadEnd(
          INTERNAL_PADDING + value + INTERNAL_PADDING,
          maxLength + PADDING,
        ),
      ),
    );
    const message = this.text.pad(out.join(`\n`));
    this.screen.render(
      message,
      this.keymap.keymapHelp({
        message,
      }),
    );
  }
}
