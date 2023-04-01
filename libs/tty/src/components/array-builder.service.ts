import { deepExtend, is, START } from "@digital-alchemy/utilities";
import chalk from "chalk";
import { get } from "object-path";

import { Component, iComponent } from "../decorators";
import {
  ApplicationManagerService,
  IconService,
  PromptService,
} from "../services";
import {
  KeyMap,
  MainMenuCB,
  MainMenuEntry,
  ObjectBuilderOptions,
  TTY,
} from "../types";
type MagicHeader = string | [key: string, value: string];
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
   * Column header for menu widget
   */
  leftHeader?: string;
  /**
   * Column header for menu widget
   */
  rightHeader?: string;
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
export class ArrayBuilderService<VALUE extends object>
  implements iComponent<ArrayBuilderOptions<VALUE>, VALUE>
{
  constructor(
    private readonly prompt: PromptService,
    private readonly application: ApplicationManagerService,
    private readonly icons: IconService,
  ) {}

  private complete = false;
  private disabledTypes: string[] = [];
  private done: (type: VALUE[]) => void;
  private final = false;
  private options: ArrayBuilderOptions<VALUE>;
  private rows: VALUE[];
  private selectedRow: number;

  private get current() {
    return this.rows[this.selectedRow];
  }

  private get typePath(): string {
    return this.options.typePath as string;
  }

  public configure(
    options: ArrayBuilderOptions<VALUE>,
    done: (type: VALUE[]) => void,
  ): void {
    this.rows = deepExtend([], options.current ?? []);
    this.selectedRow = START;
    this.disabledTypes = [];
    this.options = options;
    this.complete = false;
    this.final = false;
    this.done = done;
    options.cancelMessage ??=
      "Are you sure you want to cancel building this object?";
    options.header ??= "Array builder";
    options.valuesLabel ??= "Values";
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  public async render(): Promise<void> {
    // Complete = this widget must have `configure()` called prior to doing more rendering
    if (this.complete) {
      return;
    }
    // Final = this widget has returned a value,
    //   and wants to clean up the UI a bit before finishing
    if (this.final) {
      this.final = false;
      this.complete = true;
      // return this.renderFinal();
    }
    this.header();
    const keyMapExtras: KeyMap = {};
    type ValueToggle = { value: VALUE };
    type MenuResult = ValueToggle | TypeToggle | string;
    const right: MainMenuEntry<MenuResult>[] = [];
    let toggles: MainMenuEntry<TypeToggle>[] = [];
    if (!is.empty(this.rows)) {
      keyMapExtras.r = {
        entry: [chalk.blue.dim("remove row"), "remove"],
      };
      keyMapExtras.e = {
        entry: [chalk.blue.dim("edit"), "edit"],
      };

      if (!is.empty(this.typePath)) {
        toggles = is
          .unique(this.rows.map(row => String(get(row, this.typePath))))
          .map(type => {
            return {
              entry: [type, { type }],
              icon: this.icons.getIcon(
                this.disabledTypes.includes(type) ? "toggle_off" : "toggle_on",
              ),
              type: "Show Group",
            } as MainMenuEntry<TypeToggle>;
          });
        right.push(...toggles);
        keyMapExtras["["] = {
          entry: [chalk.blue.dim("toggle on all types"), "toggle_on"],
        };
        keyMapExtras["]"] = {
          entry: [chalk.blue.dim("toggle off all types"), "toggle_off"],
        };
        keyMapExtras.t = {
          entry: [chalk.blue.dim("toggle selected type"), "toggle"],
        };
      }
    }

    // Current list of rows
    const left = this.rows
      .map(row => {
        return {
          entry: [get(row, String(this.options.labelPath)), { value: row }],
          // Maybe one day dot notation will actually be relevant to this
          type: is.empty(this.typePath)
            ? undefined
            : String(get(row, this.typePath)),
        } as MainMenuEntry<{ value: VALUE }>;
      })
      .filter(({ type }) => !this.disabledTypes.includes(type));

    let typeToggle: TypeToggle;
    let valueRemove: ValueToggle;
    const keyMapCallback: MainMenuCB<MenuResult> = (action, [, value]) => {
      switch (action) {
        case "toggle":
          if (is.object(value) && !is.undefined((value as TypeToggle).type)) {
            typeToggle = value as TypeToggle;
            return true;
          }
          return chalk`Can only use toggle on {magenta.bold Show Group} entries.`;
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
        "+": {
          alias: ["a"],
          entry: [chalk.blue.dim("add row"), "add"],
        },
        escape: ["done"],
        ...keyMapExtras,
      },
      keyMapCallback,
      left: is.empty(this.typePath) ? right : left,
      leftHeader: this.options.leftHeader ?? "Array",
      right: is.empty(this.typePath) ? left : right,
      rightHeader: this.options.rightHeader ?? "Actions",
    });

    if (is.object(result)) {
      if (!is.undefined((result as TypeToggle).type)) {
        typeToggle = result as TypeToggle;
        result = "toggle";
      } else if (is.undefined((result as ValueToggle).value)) {
        return;
      } else {
        result = result as ValueToggle;
        result = "edit";
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

  private onEnd(): boolean {
    if (!this.done) {
      return;
    }
    this.final = true;
    this.done(this.rows);
    this.render();
    this.done = undefined;
    return false;
  }
}
