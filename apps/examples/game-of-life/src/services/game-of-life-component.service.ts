import {
  ApplicationManagerService,
  Component,
  ComponentDoneCallback,
  iComponent,
  KeyboardManagerService,
  ScreenService,
  TTYComponentKeymap,
} from "@digital-alchemy/tty";

import { GameOfLifeComponentOptions } from "../types";
import { ConwayService } from "./conway.service";

const KEYMAP = new Map([[{}, "onEnd"]]) as TTYComponentKeymap;

@Component({ type: "game-of-life" })
export class GameOfLifeComponentService implements iComponent {
  constructor(
    private readonly screen: ScreenService,
    private readonly keyboard: KeyboardManagerService,
    private readonly conway: ConwayService,
    private readonly application: ApplicationManagerService,
  ) {}

  private config: GameOfLifeComponentOptions;
  private done: ComponentDoneCallback;
  private isDone = false;
  private label: string;

  public configure(
    config: GameOfLifeComponentOptions,
    callback: ComponentDoneCallback,
  ): void {
    this.application.setHeader("Conway");
    this.config = config;
    this.isDone = false;
    this.done = callback;
    this.keyboard.setKeymap(this, KEYMAP);
  }

  public onEnd() {
    this.isDone = true;
    this.done();
  }

  public render(): void {
    // if (this.isDone) {
    //   return;
    // }
    // this.screen.printLine(this.label ?? chalk.bold(this.message));
  }
}
