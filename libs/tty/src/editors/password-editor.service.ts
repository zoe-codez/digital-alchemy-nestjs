import { InjectConfig } from "@digital-alchemy/boilerplate";
import { INVERT_VALUE, is, SINGLE, START } from "@digital-alchemy/utilities";
import chalk from "chalk";

import { PROMPT_QUESTION } from "../config";
import { Editor, iBuilderEditor } from "../decorators";
import { template } from "../includes";
import { KeyboardManagerService, ScreenService } from "../services";
import { KeyModifiers, tKeyMap, TTYKeypressOptions } from "../types";

export interface PasswordEditorRenderOptions {
  current: string;
  label?: string;
  placeholder?: string;
  width?: number;
}

const KEYMAP: tKeyMap = new Map<TTYKeypressOptions, string>([
  [{ catchAll: true, powerUser: true }, "onKeyPress"],
  [{ description: "done", key: "enter" }, "onEnd"],
  [{ key: "escape" }, "reset"],
  [{ key: "f3" }, "clear"],
  [{ key: "f4" }, "cancel"],
]);

@Editor({ type: "password" })
export class PasswordEditorService
  implements iBuilderEditor<PasswordEditorRenderOptions>
{
  constructor(
    private readonly keyboard: KeyboardManagerService,
    private readonly screen: ScreenService,
    @InjectConfig(PROMPT_QUESTION)
    private readonly promptQuestion: string,
  ) {}

  private complete = false;
  private config: PasswordEditorRenderOptions;
  private done: (type: string) => void;
  private value: string;

  public configure(
    config: PasswordEditorRenderOptions,
    done: (type: unknown) => void,
  ) {
    this.config = config;
    this.complete = false;
    this.value = this.config.current ?? "";
    this.done = done;
    this.keyboard.setKeyMap(this, KEYMAP);
  }

  public render(): void {
    if (this.complete) {
      this.screen.render(
        template(
          `${this.promptQuestion} {bold ${this.config.label}} {gray ${this.value}}`,
        ),
      );
      return;
    }
    if (is.empty(this.value)) {
      return this.renderBox("bgBlue");
    }
    return this.renderBox("bgWhite");
  }

  protected cancel(): void {
    this.value = this.config.current;
    this.onEnd();
  }

  protected clear(): void {
    this.value = ``;
  }

  protected onEnd() {
    this.complete = true;
    this.render();
    this.done(this.value);
    return false;
  }

  protected onKeyPress(key: string, { shift }: KeyModifiers) {
    if (key === "backspace") {
      if (shift) {
        // this.value = ``;
        return;
      }
      this.value = this.value.slice(START, INVERT_VALUE);
      return;
    }
    if (key === "space") {
      this.value += " ";
      return;
    }
    if (key === "tab") {
      return;
    }
    if (key.length > SINGLE) {
      return;
    }
    this.value += shift ? key.toUpperCase() : key;
  }

  protected reset(): void {
    this.value = this.config.current;
  }

  // FIXME: this
  private renderBox(bgColor: string): void {
    bgColor;
    // let value = is.empty(this.value)
    //   ? this.config.placeholder ?? DEFAULT_PLACEHOLDER
    //   : this.value;
    // const maxLength = this.config.width - PADDING;
    // const out: string[] = [];
    // if (this.config.label) {
    //   out.push(chalk`{green ? } ${this.config.label}`);
    // }
    // const stripped = ansiStrip(value);
    // let length = stripped.length;
    // if (length > maxLength - ELLIPSES.length) {
    //   const update =
    //     ELLIPSES + stripped.slice((maxLength - ELLIPSES.length) * INVERT_VALUE);
    //   value = value.replace(stripped, update);
    //   length = update.length;
    // }
    // out.push(
    //   chalk[bgColor].black(
    //     ansiPadEnd(
    //       INTERNAL_PADDING + value + INTERNAL_PADDING,
    //       maxLength + PADDING,
    //     ),
    //   ),
    // );
    //   const message = this.textRendering.pad(out.join(`\n`));
    //   this.screenService.render(
    //     message,
    //     this.keymap.keymapHelp({
    //       message,
    //     }),
    //   );
  }
}
