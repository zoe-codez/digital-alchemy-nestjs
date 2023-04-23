import { InjectConfig } from "@digital-alchemy/boilerplate";
import chalk from "chalk";

import { DEFAULT_ACKNOWLEDGE_MESSAGE } from "../config";
import { Component, ComponentDoneCallback, iComponent } from "../decorators";
import { KeyboardManagerService, ScreenService } from "../services";

const KEYMAP = new Map([[{}, "onEnd"]]);

@Component({ type: "acknowledge" })
export class AcknowledgeComponentService implements iComponent {
  constructor(
    private readonly screen: ScreenService,
    private readonly keyboard: KeyboardManagerService,
    @InjectConfig(DEFAULT_ACKNOWLEDGE_MESSAGE)
    private readonly message: string,
  ) {}

  private done: ComponentDoneCallback;
  private isDone = false;
  private label: string;

  public configure(
    config: { label: string },
    callback: ComponentDoneCallback,
  ): void {
    this.isDone = false;
    this.done = callback;
    this.label = config.label;
    this.keyboard.setKeyMap(this, KEYMAP);
  }

  public onEnd() {
    this.isDone = true;
    this.done();
  }

  public render(): void {
    if (this.isDone) {
      return;
    }
    this.screen.printLine(this.label ?? chalk.bold(this.message));
  }
}
