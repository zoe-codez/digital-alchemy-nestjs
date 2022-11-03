import { deepExtend, is, START } from "@steggy/utilities";
import chalk from "chalk";
import { get } from "object-path";

import { KeyMap, MainMenuCB } from "../components";
import { MainMenuEntry, ObjectBuilderOptions, TTY } from "../contracts";
import { Component } from "../decorators";
import {
  ApplicationManagerService,
  IconService,
  PromptService,
} from "../services";
type MagicHeader = string | [string, string];
type TypeToggle = { type: string };

export type ArrayBuilderOptions<VALUE extends object> = Omit<
  ObjectBuilderOptions<VALUE, never>,
  "cancel" | "current"
> & {
  /**
   * On cancel attempt for building an object, what message should be displayed?
   */
  cancelMessage?: string;
  /**
   * Current list of values
   */
  current?: VALUE[];
  /**
   * Default value to use when creating new rows
   */
  defaultRow?: VALUE;
  /**
   * Header message for top of the screen
   */
  header?: MagicHeader;
  /**
   * Use for generating menu labels.
   * Will be converted to string
   */
  labelPath: keyof VALUE;
  /**
   * Used for generating type labels
   */
  typePath?: keyof VALUE;
  /**
   * Left side column label
   */
  valuesLabel?: string;
};

@Component({ type: "array" })
export class ArrayBuilderService<VALUE extends object> {
  constructor(
    private readonly prompt: PromptService,
    private readonly application: ApplicationManagerService,
    private readonly icons: IconService,
  ) {}

  private disabledTypes: string[] = [];
  private options: ArrayBuilderOptions<VALUE>;
  private rows: VALUE[];
  private selectedRow: number;

  private get current() {
    return this.rows[this.selectedRow];
  }

  public configure(options: ArrayBuilderOptions<VALUE>): void {
    this.rows = deepExtend([], options.current ?? []);
    this.selectedRow = START;
    this.disabledTypes = [];
    this.options = options;
    options.cancelMessage ??=
      "Are you sure you want to cancel building this object?";
    options.header ??= "Array builder";
    options.valuesLabel ??= "Values";
  }

  // eslint-disable-next-line radar/cognitive-complexity
  public async render(): Promise<void> {
    this.header();
    const keyMapExtras: KeyMap = {};
    type ValueToggle = { value: VALUE };
    type MenuResult = ValueToggle | TypeToggle | string;
    const right: MainMenuEntry<MenuResult>[] = [];
    let toggles: MainMenuEntry<TypeToggle>[] = [];
    if (!is.empty(this.rows)) {
      keyMapExtras.r = {
        entry: [chalk.blue("remove row"), "remove"],
      };
      keyMapExtras.e = {
        entry: [chalk.blue("edit")],
      };

      if (!is.empty(this.options.typePath as string)) {
        toggles = is
          .unique(
            this.rows.map(row =>
              String(get(row, String(this.options.typePath))),
            ),
          )
          .map(type => {
            return {
              entry: [type, { type }],
              icon: this.icons.getIcon(
                this.disabledTypes.includes(type) ? "toggle_off" : "toggle_on",
              ),
              type: "Type Toggle",
            } as MainMenuEntry<TypeToggle>;
          });
        right.push(...toggles);
        keyMapExtras["["] = {
          entry: [chalk.blue("toggle on all types"), "toggle_on"],
        };
        keyMapExtras["]"] = {
          entry: [chalk.blue("toggle off all types"), "toggle_off"],
        };
        keyMapExtras.t = {
          entry: [chalk.blue("toggle selected type"), "toggle"],
        };
      }
    }

    // Current list of rows
    const left = this.rows.map(row => {
      return {
        entry: [get(row, String(this.options.labelPath)), { value: row }],
        // Maybe one day dot notation will actually be relevant to this
        type: !is.empty(this.options.typePath as string)
          ? String(get(row, String(this.options.typePath)))
          : undefined,
      } as MainMenuEntry<{ value: VALUE }>;
    });

    let typeToggle: TypeToggle;
    let valueRemove: ValueToggle;
    const keyMapCallback: MainMenuCB<MenuResult> = (action, [, value]) => {
      switch (action) {
        case "toggle":
          if (is.object(value) && !is.undefined((value as TypeToggle).type)) {
            typeToggle = value as TypeToggle;
            return true;
          }
          return chalk`Can only use toggle on {magenta.bold Type Toggle} entries.`;
        case "remove":
          if (is.object(value) && !is.undefined((value as ValueToggle).value)) {
            valueRemove = value as ValueToggle;
            return true;
          }
          return chalk`Can only use on values in the {bold.blue ${this.options.valuesLabel}} entries`;
      }
      return true;
    };

    let result = await this.prompt.menu<MenuResult>({
      emptyMessage: chalk` {yellow.bold.inverse  No items in array }`,
      keyMap: {
        a: {
          entry: ["add row", "add"],
        },
        escape: ["done"],
        ...keyMapExtras,
      },
      keyMapCallback,
      left,
      right,
    });

    if (is.object(result)) {
      if (!is.undefined((result as TypeToggle).type)) {
        typeToggle = result as TypeToggle;
        result = "toggle";
      } else if (!is.undefined((result as ValueToggle).value)) {
        result = result as ValueToggle;
        result = "edit";
      } else {
        return;
      }
    }

    const cancel = Symbol();
    switch (result) {
      // done with editing, return result
      case "done":
        this.onEnd();
        return;

      // remove a row (prompt first)
      case "remove":
        if (
          await this.prompt.confirm({
            label: chalk`Are you sure you want to delete {red ${get(
              this.current,
              String(this.options.labelPath),
            )}}`,
          })
        ) {
          this.rows = this.rows.filter(row => row !== valueRemove.value);
        }
        return await this.render();

      // create a new row
      case "add":
        const add = await this.objectBuild(
          deepExtend({}, this.options.defaultRow),
          cancel,
        );
        if (add !== cancel) {
          this.rows.push(add);
        }
        return await this.render();

      // toggle visibility of a type category
      case "toggle":
        this.disabledTypes = this.disabledTypes.includes(
          String(typeToggle.type),
        )
          ? this.disabledTypes.filter(type => type !== String(typeToggle.type))
          : [...this.disabledTypes, String(typeToggle.type)];
        return await this.render();

      // toggle on all type categories
      case "toggle_on":
        this.disabledTypes = toggles.map(i => String(TTY.GV(i).type));
        return await this.render();

      // toggle off all type categories
      case "toggle_off":
        this.disabledTypes = [];
        return await this.render();

      // edit a row
      case "edit":
        const build = await this.objectBuild(
          deepExtend({}, this.rows[this.selectedRow]),
          cancel,
        );
        if (build !== cancel) {
          this.rows[this.selectedRow] = build;
        }
        return await this.render();
    }
  }

  private header(): void {
    const message = this.options.header;
    if (is.string(message)) {
      this.application.setHeader(message);
      return;
    }
    const [a, b] = message;
    this.application.setHeader(a, b);
  }

  private async objectBuild<CANCEL = symbol>(
    current: VALUE,
    cancel?: CANCEL,
  ): Promise<VALUE | CANCEL> {
    const { elements, headerMessage, helpNotes, sanitize, validate } =
      this.options;
    return await this.prompt.objectBuilder<VALUE, CANCEL>({
      async cancel({ dirtyProperties, cancelFunction, confirm }) {
        if (is.empty(dirtyProperties)) {
          cancelFunction(cancel);
          return;
        }
        const status = await confirm(
          "Are you sure you want to discard changes?",
        );
        if (status) {
          cancelFunction(cancel);
        }
      },
      current,
      elements,
      headerMessage,
      helpNotes,
      sanitize,
      validate,
    });
  }

  private onEnd(): void {
    //
  }
}
