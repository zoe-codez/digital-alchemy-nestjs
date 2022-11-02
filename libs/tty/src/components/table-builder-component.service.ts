import { forwardRef, Inject } from "@nestjs/common";
import {
  ARRAY_OFFSET,
  deepExtend,
  is,
  START,
  TitleCase,
} from "@steggy/utilities";
import { get, set } from "object-path";

import {
  DirectCB,
  MainMenuEntry,
  ObjectBuilderOptions,
  tKeyMap,
  TTY,
  TTYKeypressOptions,
} from "../contracts";
import { Component, iComponent } from "../decorators";
import { MergeHelp } from "../includes";
import {
  FormService,
  KeyboardManagerService,
  KeymapService,
  PromptService,
  ScreenService,
  TableService,
  TextRenderingService,
} from "../services";

const FORM_KEYMAP: tKeyMap = new Map([
  // While there is no editor
  [{ description: "done", key: "d" }, "onEnd"],
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
  [{ description: "edit cell", key: "enter" }, "enableEdit"],
] as [TTYKeypressOptions, string | DirectCB][]);
const CANCELLABLE: tKeyMap = new Map([
  [{ description: "cancel", key: "escape" }, "cancel"],
]);
const HELP_ERASE_SIZE = 3;

@Component({ type: "table" })
export class TableBuilderComponentService<
  VALUE extends object = Record<string, unknown>,
> implements iComponent<ObjectBuilderOptions<VALUE>, VALUE>
{
  constructor(
    private readonly table: TableService<VALUE>,
    private readonly form: FormService<VALUE>,
    private readonly text: TextRenderingService,
    private readonly keymap: KeymapService,
    private readonly screen: ScreenService,
    private readonly keyboard: KeyboardManagerService,
    @Inject(forwardRef(() => PromptService))
    private readonly prompt: PromptService,
  ) {}

  private complete = false;
  private dirty = false;
  private done: (type: VALUE | VALUE[]) => void;
  private opt: ObjectBuilderOptions<VALUE>;
  private rows: VALUE[];
  private selectedCell = START;
  private selectedRow = START;
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
    config: ObjectBuilderOptions<VALUE>,
    done: (type: VALUE[]) => void,
  ): void {
    this.complete = false;
    this.dirty = false;
    this.opt = config;
    config.elements = config.elements.map(i => {
      i.name ??= TitleCase(i.path);
      return i;
    });
    this.done = done;
    this.opt.sanitize ??= "defined-paths";
    this.opt.current ??= {} as VALUE;
    this.selectedRow = START;
    this.selectedCell = START;
    this.rows = Array.isArray(this.opt.current)
      ? this.opt.current
      : [this.opt.current];
    this.value = deepExtend({} as VALUE, this.opt.current) as VALUE;
    this.setKeymap();
  }

  public render(): void {
    if (this.complete) {
      this.screen.render("", "");
      return;
    }
    this.renderSingle();
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

  protected add(): void {
    const value = Object.fromEntries(
      this.columns.map(column => {
        const value = is.function(column.default)
          ? column.default()
          : column.default;
        return [column.path, value];
      }),
    );
    const wasEmpty = is.empty(this.rows);
    this.rows.push(value as VALUE);
    this.setKeymap();
    if (wasEmpty) {
      this.selectedRow = this.rows.length - ARRAY_OFFSET;
    }
    // ? Needs an extra render for some reason
    // Should be unnecessary
    this.render();
  }

  protected cancel(): void {
    const { cancel, current } = this.opt;
    if (is.function(cancel)) {
      cancel(
        value => {
          this.value = value ?? current;
          this.onEnd(true);
        },
        async (message = "Discard changes?") => {
          let value: boolean;
          await this.screen.footerWrap(async () => {
            value = await this.prompt.confirm({ label: message });
          });
          this.render();
          return value;
        },
      );
      return;
    }
    this.value = cancel as VALUE;
    this.onEnd(true);
  }

  protected async delete(): Promise<boolean> {
    const result = await this.screen.footerWrap(async () => {
      return await this.prompt.confirm({
        label: "Are you sure you want to delete this?",
      });
    });
    if (!result) {
      this.render();
      return;
    }
    this.rows = this.rows.filter((item, index) => index !== this.selectedRow);
    if (this.selectedRow > this.rows.length - ARRAY_OFFSET) {
      this.selectedRow = this.rows.length - ARRAY_OFFSET;
    }
    this.setKeymap();
    this.render();
    return false;
  }

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
        case "enum-array":
          const currentValue = current ?? [];
          const source = column.options.filter(
            i => !currentValue.includes(TTY.GV(i)),
          ) as MainMenuEntry<VALUE | string>[];
          const selected = column.options.filter(i =>
            currentValue.includes(TTY.GV(i)),
          ) as MainMenuEntry<VALUE | string>[];
          value = await this.prompt.listBuild<VALUE>({
            current: selected,
            source,
          });
          break;
        case "enum":
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

  protected onDown(): boolean {
    if (this.selectedRow === this.visibleColumns.length - ARRAY_OFFSET) {
      this.selectedRow = START;
      return;
    }
    this.selectedRow++;
  }

  protected onEnd(cancelled = false): void {
    // ? mental note:
    // cancelled can be non-boolean values
    // this method is ALSO called by the keyboard manager, which passes in the key that was pressed
    this.complete = true;
    this.render();
    if (this.opt.sanitize === "none" || cancelled === true) {
      this.done(this.value);
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

  protected onLeft(): boolean {
    if (this.selectedCell === START) {
      return false;
    }
    this.selectedCell--;
  }

  protected onPageDown(): void {
    this.selectedRow = this.visibleColumns.length;
  }

  protected onPageUp(): void {
    this.selectedRow = START;
  }

  protected onRight(): boolean {
    if (this.selectedCell === this.columns.length - ARRAY_OFFSET) {
      return false;
    }
    this.selectedCell++;
  }

  protected onUp(): boolean {
    if (this.selectedRow === START) {
      this.selectedRow = this.visibleColumns.length - ARRAY_OFFSET;
      return;
    }
    this.selectedRow--;
  }

  private renderSingle(): void {
    const message = MergeHelp(
      this.text.pad(
        this.form.renderForm(
          {
            ...this.opt,
            elements: this.visibleColumns,
          },
          this.value,
          this.selectedRow,
        ),
      ),
      this.visibleColumns[this.selectedRow],
    );
    this.screen.render(
      message,
      this.keymap.keymapHelp({
        message,
        notes: this.notes,
      }),
    );
  }

  private setKeymap(): void {
    const maps: tKeyMap[] = [];
    maps.push(FORM_KEYMAP);
    if (!is.undefined(this.opt.cancel)) {
      maps.push(CANCELLABLE);
    }
    this.keyboard.setKeyMap(this, ...maps);
  }
}
