import { AutoLogService, InjectConfig } from "@digital-alchemy/boilerplate";
import { is } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import chalk from "chalk";
import { edit } from "external-editor";

import { PROMPT_QUESTION } from "../config";
import {
  DateEditorEditorOptions,
  NumberEditorRenderOptions,
  StringEditorRenderOptions,
} from "../editors";
import { ansiEscapes, template } from "../includes";
import {
  ArrayBuilderOptions,
  ExternalEditorOptions,
  ListBuilderOptions,
  MenuComponentOptions,
  ObjectBuilderOptions,
  PromptAcknowledgeOptions,
  PromptBooleanOptions,
  PromptConfirmOptions,
  PromptPasswordOptions,
  PromptPickOneOptions,
  PromptTimeOptions,
} from "../types";
import { ApplicationManagerService } from "./application-manager.service";
import { ScreenService } from "./screen.service";

@Injectable()
export class PromptService {
  constructor(
    private readonly logger: AutoLogService,
    @Inject(forwardRef(() => ApplicationManagerService))
    private readonly applicationManager: ApplicationManagerService,
    @InjectConfig(PROMPT_QUESTION)
    private readonly promptQuestion: string,
    private readonly screen: ScreenService,
  ) {}

  /**
   * Force a user interaction before continuing
   *
   * Good for giving the user time to read a message before a screen clear happens
   */
  public async acknowledge({
    label,
  }: PromptAcknowledgeOptions = {}): Promise<void> {
    await this.applicationManager.activateComponent("acknowledge", { label });
  }

  public async arrayBuilder<VALUE extends object = object>(
    options: ArrayBuilderOptions<VALUE>,
  ): Promise<VALUE[]> {
    const result = await this.applicationManager.activateComponent<
      ArrayBuilderOptions<VALUE>,
      VALUE
    >("array", options);
    return result as VALUE[];
  }

  /**
   * prompt for a true / false value
   */
  public async boolean({
    label: message,
    current = false,
  }: PromptBooleanOptions): Promise<boolean> {
    return (await this.menu({
      condensed: true,
      headerMessage: template(`  ${this.promptQuestion} ${message}`),
      right: [{ entry: ["true", true] }, { entry: ["false", false] }],
      search: { enabled: false },
      value: current,
    })) as boolean;
  }

  /**
   * similar to boolean, but different format for the question to the user
   */
  public async confirm({
    label = "Are you sure?",
    current = false,
  }: PromptConfirmOptions = {}): Promise<boolean> {
    return await this.applicationManager.activateComponent("confirm", {
      current,
      label,
    });
  }

  /**
   * Retrieve a single date from the user.
   *
   * Can be used to retrieve date range also
   */
  public async date<T extends Date | { from: Date; to: Date } = Date>({
    current,
    label,
    ...options
  }: DateEditorEditorOptions = {}): Promise<T> {
    const result = await this.applicationManager.activateEditor<
      DateEditorEditorOptions,
      string
    >("date", {
      current,
      label,
      ...options,
    });
    if (is.array(result)) {
      const [from, to] = result;
      return {
        from: new Date(from),
        to: new Date(to),
      } as T;
    }
    return new Date(result) as T;
  }

  /**
   * Retrieve date range from user
   */
  public async dateRange({
    current,
    label,
    ...options
  }: DateEditorEditorOptions = {}): Promise<{ from: Date; to: Date }> {
    const [from, to] = await this.applicationManager.activateEditor<
      DateEditorEditorOptions,
      string[]
    >("date", {
      current,
      label,
      ...options,
    });
    return { from: new Date(from), to: new Date(to) };
  }

  public external({
    text,
    trim = true,
    ...options
  }: ExternalEditorOptions): string {
    this.screen.rl.output.unmute();
    this.screen.printLine(ansiEscapes.cursorShow);
    const out = edit(text, { ...options });
    this.screen.printLine(ansiEscapes.cursorHide);
    this.screen.rl.output.mute();
    if (!trim) {
      return out;
    }
    return out.trim();
  }

  /**
   * Menus, keyboard shortcuts, and general purpose tool
   *
   * Use the `.cancel` method attached to the promise to close the menu without user interaction
   */
  public async menu<VALUE extends unknown = string>(
    options: MenuComponentOptions<VALUE | string>,
  ): Promise<VALUE | string> {
    return await this.applicationManager.activateComponent("menu", {
      keyMap: {},
      ...options,
    });
  }

  /**
   * Retrieve a number value
   */
  public async number(
    options: NumberEditorRenderOptions = {},
  ): Promise<number> {
    return await this.applicationManager.activateEditor("number", {
      label: `Number value`,
      ...options,
    } as NumberEditorRenderOptions);
  }

  /**
   * Build a single object inside a table
   */
  public async objectBuilder<
    VALUE extends object = object,
    CANCEL extends unknown = never,
  >(options: ObjectBuilderOptions<VALUE, CANCEL>): Promise<VALUE | CANCEL> {
    const result = await this.applicationManager.activateComponent<
      ObjectBuilderOptions<VALUE, CANCEL>,
      VALUE
    >("object", options);
    return result;
  }

  /**
   * Take in a string value, hiding the individual characters from the screen
   */
  public async password({
    label = `Password value`,
    current,
  }: PromptPasswordOptions): Promise<string> {
    return await this.applicationManager.activateEditor("string", {
      current,
      label,
    } as StringEditorRenderOptions);
  }

  /**
   * Pick many values from a list of options
   */
  public async pickMany<T>(options: ListBuilderOptions<T>): Promise<T[]> {
    const result = await this.applicationManager.activateComponent<
      ListBuilderOptions<T>,
      T[]
    >("pick-many", options);
    return result;
  }

  /**
   * Pick a single item out of a list
   */
  public async pickOne<T extends unknown = string>({
    options,
    current,
    headerMessage = `Pick one`,
  }: PromptPickOneOptions<T>): Promise<T> {
    if (is.empty(options)) {
      this.logger.warn(`No choices to pick from`);
      return undefined;
    }
    const cancel = Symbol();
    const result = (await this.menu({
      headerMessage: chalk`{blue ?} ${headerMessage}`,
      keyMap: { escape: ["Cancel", cancel as T] },
      right: options,
      value: current,
    })) as T;
    if (result === cancel) {
      return current as T;
    }
    return result;
  }

  /**
   * Plain string value
   */
  public async string(
    options: StringEditorRenderOptions = {},
  ): Promise<string> {
    return await this.applicationManager.activateEditor("string", {
      label: chalk.bold`String value`,
      ...options,
    } as StringEditorRenderOptions);
  }

  /**
   * Retrieve a date object that is used to show time.
   *
   * Day value will be for today
   */
  public async time({
    label = `Time value`,
    current = new Date(),
  }: PromptTimeOptions = {}): Promise<Date> {
    return await this.date({
      current: current.toISOString(),
      label,
      type: "time",
    });
  }
}
