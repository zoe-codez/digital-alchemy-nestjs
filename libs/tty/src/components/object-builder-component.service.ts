import {
  ARRAY_OFFSET,
  deepCloneArray,
  deepExtend,
  is,
  SECOND,
  sleep,
  START,
  TitleCase,
} from "@digital-alchemy/utilities";
import { forwardRef, Inject } from "@nestjs/common";
import chalk from "chalk";
import { get, set } from "object-path";

import {
  BuilderCancelOptions,
  DirectCB,
  MainMenuEntry,
  ObjectBuilderMessagePositions,
  ObjectBuilderOptions,
  TableBuilderElement,
  tKeyMap,
  TTY,
  TTYKeypressOptions,
} from "../contracts";
import { Component, iComponent } from "../decorators";
import {
  FormService,
  KeyboardManagerService,
  KeymapService,
  PromptService,
  ScreenService,
  TextRenderingService,
} from "../services";

type HelpText = {
  helpText: string;
};

const FORM_KEYMAP: tKeyMap = new Map([
  // While there is no editor
  [{ description: "done", key: "x", modifiers: { ctrl: true } }, "onEnd"],
  [{ description: "cursor up", key: "up" }, "onUp"],
  [
    { description: "top", key: ["pageup", "home"], powerUser: true },
    "onPageUp",
  ],
  [
    { description: "bottom", key: ["pagedown", "end"], powerUser: true },
    "onPageDown",
  ],
  [{ description: "cursor down", key: "down" }, "onDown"],
  [{ description: chalk.blue.dim("edit cell"), key: "enter" }, "enableEdit"],
  [
    {
      description: chalk.blue.dim("reset"),
      key: "r",
      modifiers: { ctrl: true },
    },
    "resetField",
  ],
] as [TTYKeypressOptions, string | DirectCB][]);
const CANCELLABLE: tKeyMap = new Map([
  [{ description: "cancel", key: "escape" }, "cancel"],
]);
const HELP_ERASE_SIZE = 3;
const DEFAULT_MESSAGE_TIMEOUT = 3;
const NORMAL_EXIT = Symbol();

@Component({ type: "object" })
export class ObjectBuilderComponentService<
  VALUE extends object = Record<string, unknown>,
  CANCEL extends unknown = never,
> implements iComponent<ObjectBuilderOptions<VALUE, CANCEL>, VALUE, CANCEL>
{
  constructor(
    private readonly form: FormService<VALUE, CANCEL>,
    private readonly text: TextRenderingService,
    private readonly keymap: KeymapService,
    private readonly screen: ScreenService,
    private readonly keyboard: KeyboardManagerService,
    @Inject(forwardRef(() => PromptService))
    private readonly prompt: PromptService,
  ) {}

  /**
   * Stop processing actions, render a static message
   */
  private complete = false;
  /**
   * A message sent by calling code
   */
  private displayMessage: string;
  /**
   * Where to position the message relative to normal rendering
   */
  private displayMessagePosition: ObjectBuilderMessagePositions;
  /**
   * Timeout until the message is removed
   */
  private displayMessageTimeout: ReturnType<typeof sleep>;
  /**
   * Method to call when complete
   */
  private done: (type: VALUE | CANCEL) => void;
  /**
   * Options passed in to configure the current run
   */
  private opt: ObjectBuilderOptions<VALUE, CANCEL>;
  /**
   * Selected row relative to visible elements
   */
  private selectedRow = START;
  /**
   * The current working value
   */
  private value: VALUE;

  private get dirtyProperties(): (keyof VALUE)[] {
    const original = this.opt.current ?? {};
    const current = this.value;
    return this.columns
      .filter(({ path }) => get(original, path) !== get(current, path))
      .map(({ path }) => path);
  }

  private get headerMessage(): string {
    const { headerMessage } = this.opt;
    if (is.string(headerMessage)) {
      if (headerMessage.endsWith(`\n`)) {
        return headerMessage;
      }
      return headerMessage + `\n`;
    }
    if (is.function(headerMessage)) {
      const out = headerMessage(this.value);
      if (out.endsWith(`\n`)) {
        return out;
      }
      return out + `\n`;
    }
    return ``;
  }

  private get helpNotes(): string {
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
    config: ObjectBuilderOptions<VALUE, CANCEL>,
    done: (type: VALUE | CANCEL) => void,
  ): void {
    // Reset from last run
    this.complete = false;
    this.displayMessage = "";
    this.opt = config;
    this.done = done;
    this.selectedRow = START;

    // Build up some defaults on the elements
    config.elements = config.elements.map(i => {
      i.name ??= TitleCase(i.path);
      return i;
    });

    // Set up defaults
    config.sanitize ??= "defined-paths";

    // Set up the current value
    this.value = deepExtend({}, config.current ?? {}) as VALUE;
    this.columns.forEach(column => this.setDefault(column));

    this.setKeymap();
  }

  public render(): void {
    if (this.complete) {
      this.screen.render("", "");
      return;
    }
    const aboveBar =
      this.displayMessagePosition === "above-bar" &&
      !is.empty(this.displayMessage)
        ? { helpText: this.displayMessage }
        : (this.visibleColumns[this.selectedRow] as HelpText);

    const belowBar =
      this.displayMessagePosition === "below-bar" &&
      !is.empty(this.displayMessage)
        ? this.displayMessage
        : this.helpNotes;

    const message = this.text.mergeHelp(
      this.text.pad(
        this.form.renderForm(
          {
            ...this.opt,
            elements: this.visibleColumns,
          },
          this.value,
          this.opt.current,
          this.selectedRow,
        ),
      ),
      aboveBar,
    );

    let headerMessage = "";
    if (this.displayMessagePosition === "header-replace") {
      headerMessage = is.empty(this.displayMessage)
        ? this.headerMessage
        : this.displayMessage;
    } else {
      headerMessage = this.headerMessage;
      if (!is.empty(this.displayMessage)) {
        if (this.displayMessagePosition === "header-append") {
          headerMessage = headerMessage + this.displayMessage;
        } else if (this.displayMessagePosition === "header-prepend") {
          headerMessage = this.displayMessage + headerMessage;
        }
      }
    }

    this.screen.render(
      headerMessage + message,
      this.keymap.keymapHelp({
        message,
        notes: belowBar,
      }),
    );
  }

  private get columns() {
    return this.opt.elements;
  }

  private get visibleColumns() {
    return this.columns.filter(i => {
      if (!i.hidden) {
        return true;
      }
      return !i.hidden(this.value);
    });
  }

  /**
   * available as keyboard shortcut if options.cancel is defined
   *
   * ## Provided as function
   *
   * Call w/ some extra parameters, and bail out early.
   * Calling code can utilize parameters to call an end to this widget at any time, do validation, or present confirmations.
   * It is intended to be async
   *
   * ## Provided as anything else
   *
   * Immediate end, return cancel value
   */
  protected cancel(): void {
    const { cancel, current } = this.opt;
    if (is.function(cancel)) {
      const options: BuilderCancelOptions<VALUE> = {
        cancelFunction: cancelValue => {
          this.value = cancelValue ?? current;
          this.end(cancelValue ?? current);
        },
        confirm: async (message = "Discard changes?") => {
          let value: boolean;
          await this.screen.footerWrap(async () => {
            value = await this.prompt.confirm({ label: message });
          });
          this.render();
          return value;
        },
        current: this.value,
        dirtyProperties: this.dirtyProperties,
        original: current,
        /**
         * - if there is an existing timer, stop it
         * - set the new message position and text
         * - immediate
         */
        sendMessage: async ({
          message,
          timeout = DEFAULT_MESSAGE_TIMEOUT,
          position = "below-bar",
          immediateClear = false,
        }) => {
          if (this.displayMessageTimeout) {
            this.displayMessageTimeout.kill("stop");
          }
          this.displayMessagePosition = position;
          this.displayMessage = message;
          this.render();
          this.displayMessageTimeout = sleep(timeout * SECOND);
          await this.displayMessageTimeout;
          this.displayMessage = undefined;
          this.displayMessageTimeout = undefined;
          if (immediateClear) {
            this.render();
          }
        },
      };
      cancel(options);
      return;
    }
    this.end(cancel);
  }

  /**
   * keyboard event
   */
  protected async enableEdit(): Promise<void> {
    await this.screen.footerWrap(async () => {
      const column = this.visibleColumns[this.selectedRow];
      const row = this.value;
      const current = get(is.object(row) ? row : {}, column.path);
      let value: unknown;
      switch (column.type) {
        case "date":
          value = await this.prompt.date({
            current,
            label: column.name,
          });
          break;
        case "number":
          value = await this.prompt.number({ current, label: column.name });
          break;
        case "boolean":
          value = await this.prompt.boolean({
            current: current,
            label: column.name,
          });
          break;
        case "string":
          value = await this.prompt.string({ current, label: column.name });
          break;
        case "pick-many":
          const currentValue = current ?? [];
          const source = column.options.filter(
            i => !currentValue.includes(TTY.GV(i)),
          ) as MainMenuEntry<VALUE | string>[];
          const selected = column.options.filter(i =>
            currentValue.includes(TTY.GV(i)),
          ) as MainMenuEntry<VALUE | string>[];
          value = await this.prompt.pickMany<VALUE>({
            current: selected,
            source,
          });
          break;
        case "pick-one":
          value = await this.prompt.pickOne({
            current: current,
            headerMessage: column.name,
            options: column.options,
          });
          // TODO: WHY?!
          // The auto erase should catch this... but it doesn't for some reason
          const { helpText } = column.options.find(
            i => TTY.GV(i.entry) === value,
          );
          if (!is.empty(helpText)) {
            this.screen.eraseLine(HELP_ERASE_SIZE);
          }
          break;
      }
      set(is.object(row) ? row : {}, column.path, value);
    });
    this.render();
  }

  /**
   * keyboard event
   */
  protected onDown(): boolean {
    if (this.selectedRow === this.visibleColumns.length - ARRAY_OFFSET) {
      this.selectedRow = START;
      return;
    }
    this.selectedRow++;
  }

  /**
   * keyboard event
   */
  protected async onEnd(): Promise<void> {
    const { validate, current } = this.opt;
    if (is.function(validate)) {
      const result = await validate({
        confirm: async (label = "Are you done?") => {
          let value: boolean;
          await this.screen.footerWrap(async () => {
            value = await this.prompt.confirm({ label });
          });
          this.render();
          return value;
        },
        current: this.value,
        dirtyProperties: this.dirtyProperties,
        original: current,
        sendMessage: async ({
          message,
          timeout = DEFAULT_MESSAGE_TIMEOUT,
          position = "below-bar",
          immediateClear = false,
          // FIXME:
          // eslint-disable-next-line sonarjs/no-identical-functions
        }) => {
          if (this.displayMessageTimeout) {
            this.displayMessageTimeout.kill("stop");
          }
          this.displayMessagePosition = position;
          this.displayMessage = message;
          this.render();
          this.displayMessageTimeout = sleep(timeout * SECOND);
          await this.displayMessageTimeout;
          this.displayMessage = undefined;
          this.displayMessageTimeout = undefined;
          if (immediateClear) {
            this.render();
          }
        },
      });
      if (!result) {
        return;
      }
    }
    this.end(NORMAL_EXIT);
  }

  /**
   * keyboard event
   */
  protected onPageDown(): void {
    this.selectedRow = this.visibleColumns.length;
  }

  /**
   * keyboard event
   */
  protected onPageUp(): void {
    this.selectedRow = START;
  }

  /**
   * keyboard event
   */
  protected onUp(): boolean {
    if (this.selectedRow === START) {
      this.selectedRow = this.visibleColumns.length - ARRAY_OFFSET;
      return;
    }
    this.selectedRow--;
  }

  /**
   * Undo any changes done during the current editing session
   */
  protected async resetField(): Promise<void> {
    let value: boolean;
    const field = this.visibleColumns[this.selectedRow];
    const original = get(this.opt.current ?? {}, field.path);
    const current = get(this.value, field.path);
    if (original === current) {
      // nothing to do
      return;
    }
    await this.screen.footerWrap(async () => {
      const label = [
        chalk`Are you sure you want to reset {bold ${field.name}} {cyan (path:} {gray .${field.path}}{cyan )}?`,
        chalk`{cyan.bold Current Value:} ${this.text.type(current)}`,
        chalk`{cyan.bold Original Value:} ${this.text.type(original)}`,
        ``,
      ].join(`\n`);
      value = await this.prompt.confirm({ label });
      // FIXME: This shouldn't be necessary
      this.screen.eraseLine(label.split(`\n`).length + ARRAY_OFFSET);
    });
    if (!value) {
      return;
    }
    set(this.value, field.path, original);
  }

  /**
   * Terminate editor
   */
  private end(code: unknown): void {
    this.complete = true;
    this.render();
    if (this.opt.sanitize === "none" || code !== NORMAL_EXIT) {
      this.done(is.undefined(code) ? this.value : (code as VALUE));
      return;
    }
    if (this.opt.sanitize === "defined-paths") {
      this.done(
        Object.fromEntries(
          Object.entries(this.value).filter(([key]) =>
            this.columns.some(({ path }) => path === key),
          ),
        ) as VALUE,
      );
      return;
    }
    // Only return properties for
    this.done(
      Object.fromEntries(
        Object.entries(this.value).filter(([key]) =>
          this.visibleColumns.some(({ path }) => path === key),
        ),
      ) as VALUE,
    );
  }

  private setDefault(column: TableBuilderElement<VALUE>): void {
    const value = get(this.value, column.path);
    if (!is.undefined(value)) {
      return;
    }
    // It's going to render this option anyways
    // Might as well make it the official default
    if (is.undefined(column.default)) {
      if (column.type === "pick-one") {
        set(this.value, column.path, TTY.GV(column.options[START]));
      }
      return;
    }
    let defaultValue: unknown = is.function(column.default)
      ? column.default(this.value)
      : column.default;
    if (is.function(column.default)) {
      set(this.value, column.path, column.default(this.value));
      return;
    }
    if (is.array(defaultValue)) {
      defaultValue = deepCloneArray(defaultValue);
    } else if (is.object(defaultValue)) {
      defaultValue = deepExtend({}, defaultValue);
    }
    set(this.value, column.path, defaultValue);
  }

  /**
   * Build up a keymap to match the current conditions
   */
  private setKeymap(): void {
    const maps: tKeyMap[] = [];
    maps.push(FORM_KEYMAP);
    if (!is.undefined(this.opt.cancel)) {
      maps.push(CANCELLABLE);
    }
    this.keyboard.setKeyMap(this, ...maps);
  }
}
