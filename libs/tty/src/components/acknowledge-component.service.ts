import chalk from "chalk";

import { Component, iComponent } from "../decorators";
import { KeyboardManagerService, ScreenService } from "../services";

@Component({ type: "acknowledge" })
export class AcknowledgeComponentService implements iComponent {
  constructor(
    private readonly screen: ScreenService,
    private readonly keyboard: KeyboardManagerService,
  ) {}

  private done: () => void;
  private isDone = false;
  private label: string;

  public configure(config: { label: string }, callback): void {
    this.isDone = false;
    this.done = callback;
    this.label = config.label;
    this.keyboard.setKeyMap(this, new Map([[{}, "complete"]]));
  }

  public render(): void {
    if (this.isDone) {
      return;
    }
    this.screen.printLine(this.label ?? chalk.bold`Any key to continue `);
  }

  protected complete(): boolean {
    this.isDone = true;
    this.done();
    return false;
  }
}
