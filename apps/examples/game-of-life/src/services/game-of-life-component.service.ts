/**
 * # TODO
 *
 * ~ Only render changes, not full screen. This is a big performance hit
 */
import { Colors, MatrixFetch, RGB } from "@digital-alchemy/rgb-matrix";
import {
  ApplicationManagerService,
  Component,
  ComponentDoneCallback,
  EnvironmentService,
  iComponent,
  KeyboardManagerService,
  KeymapService,
  PromptService,
  ScreenService,
  TextRenderingService,
  TTYComponentKeymap,
} from "@digital-alchemy/tty";
import {
  ARRAY_OFFSET,
  INCREMENT,
  NONE,
  sleep,
  START,
} from "@digital-alchemy/utilities";
import chalk from "chalk";
import { Color } from "rpi-led-matrix";

import { COLOR_OFF, COLOR_ON, GameOfLifeComponentOptions } from "../types";
import { ConwayService } from "./conway.service";

const KEYMAP: TTYComponentKeymap = new Map([
  [{ key: ["down", "s"] }, "down"],
  [{ key: "f4" }, "done"],
  [{ key: "f5" }, "reset"],
  [{ description: "toggle keymap visibility", key: "f6" }, "toggleKeymap"],
  [{ description: "toggle debug", key: "f7" }, "toggleDebug"],
  [{ description: "configure", key: "f8" }, "settings"],
  [{ key: ["left", "a"] }, "left"],
  [{ key: "r" }, "runBatch"],
  [{ key: ["right", "d"] }, "right"],
  [{ description: "toggle continuous", key: "c" }, "toggleContinuous"],
  [{ description: "toggle cell", key: "space" }, "toggle"],
  [{ key: "t" }, "tick"],
  [{ key: ["up", "w"] }, "up"],
]);
const SPEED = 50;
const RUN_TICKS = 100;
const PADDING = 2;
const KEY_PADDING = 3;

@Component({ type: "game-of-life" })
export class GameOfLifeComponentService implements iComponent {
  constructor(
    private readonly screen: ScreenService,
    private readonly keyboard: KeyboardManagerService,
    private readonly conway: ConwayService,
    private readonly keymap: KeymapService,
    private readonly environment: EnvironmentService,
    private readonly application: ApplicationManagerService,
    private readonly text: TextRenderingService,
    private readonly prompt: PromptService,
    private readonly fetch: MatrixFetch,
  ) {}

  private board: boolean[][];
  private config: GameOfLifeComponentOptions;
  private continuous = false;
  private cursorX = START;
  private cursorY = START;
  private debug = false;
  private done: ComponentDoneCallback;
  private frame = START;
  private isDone = false;
  private keymapVisible = false;
  private runTicks = NONE;

  private get renderedKeymap() {
    return this.keymap.keymapHelp({
      maxLength: this.environment.width,
      notes: this.debug
        ? this.text.debug({
            frame: this.frame,
            x: this.cursorX,
            y: this.cursorY,
          })
        : undefined,
    });
  }

  private get color() {
    const { r, g, b } = this.config.color;
    return chalk.bgRgb((r / 100) * 255, (g / 100) * 255, (b / 100) * 255).black;
  }

  public configure(
    config: GameOfLifeComponentOptions,
    callback: ComponentDoneCallback,
  ): void {
    // ? Application header
    this.application.setHeader("");
    // ? Set defaults
    this.config = config;
    this.keymapVisible = true;
    this.board = JSON.parse(JSON.stringify(config.grid));
    this.isDone = false;
    this.continuous = false;
    this.done = callback;
    this.frame = START;
    this.debug = false;
    // ? Bind keyboard
    this.keyboard.setKeymap(this, KEYMAP);
    // ? Reset cursor
    this.cursorX = START;
    this.cursorY = START;
  }

  public onEnd() {
    this.isDone = true;
    this.done();
  }

  public render(): void {
    const colorOn = this.color;
    const keymap = this.renderedKeymap;
    const height = this.getHeight(keymap);
    const message = this.board
      .slice(START, height)
      .map((row, rowIndex) => {
        return row
          .map((cell, cellIndex) => {
            const color = chalk.bgBlack;
            let char = this.debug
              ? this.conway.neighbors(this.board, rowIndex, cellIndex)
              : " ";
            if (rowIndex === this.cursorY && cellIndex === this.cursorX) {
              char = chalk.red("*");
            }
            if (this.board[rowIndex][cellIndex]) {
              return colorOn(char);
            }
            return color(char);
          })
          .join("");
      })
      .map(i => `  ${i}`)
      .join(`\n`);

    this.screen.render(message, this.keymapVisible ? keymap : undefined);
  }

  protected down(): void {
    const height = this.getHeight();
    this.cursorY =
      this.cursorY === height - ARRAY_OFFSET ? START : this.cursorY + INCREMENT;
    this.render();
  }

  protected left(): void {
    this.cursorX =
      this.cursorX === START
        ? this.config.width - ARRAY_OFFSET
        : this.cursorX - INCREMENT;
    this.render();
  }

  protected reset(): void {
    this.board = this.board.map(i => i.map(() => false));
    this.render();
  }

  protected right(): void {
    this.cursorX =
      this.cursorX === this.config.width - ARRAY_OFFSET
        ? START
        : this.cursorX + INCREMENT;
    this.render();
  }

  protected async runBatch(): Promise<void> {
    this.continuous = false;
    if (this.runTicks > NONE) {
      this.runTicks = NONE;
      return;
    }
    this.runTicks = RUN_TICKS;
    await this.runner();
  }

  protected async settings(): Promise<void> {
    this.application.setHeader("Game of Life", "Settings");
    const settings = await this.prompt.objectBuilder({
      elements: [
        {
          path: "",
          type: "boolean",
        },
      ],
    });
    await this.prompt.acknowledge();
    this.application.setHeader("");
    this.render();
  }

  protected tick(): void {
    this.runTicks = NONE;
    this.continuous = false;
    this.boardTick();
  }

  protected toggle(): void {
    this.board[this.cursorY][this.cursorX] =
      !this.board[this.cursorY][this.cursorX];
    this.render();
  }

  protected async toggleContinuous(): Promise<void> {
    this.continuous = !this.continuous;
    this.render();
    await this.runner();
  }

  protected toggleDebug(): void {
    this.debug = !this.debug;
    this.render();
  }

  protected toggleKeymap(): void {
    this.keymapVisible = !this.keymapVisible;
    this.render();
  }

  protected up(): void {
    this.cursorY =
      this.cursorY === START
        ? this.getHeight() - ARRAY_OFFSET
        : this.cursorY - INCREMENT;
    this.render();
  }

  private boardTick(): void {
    this.board = this.conway.tick(this.board);
    this.frame++;
    this.render();
  }

  private getHeight(keymap?: string) {
    keymap ??= this.renderedKeymap;
    const sliceLines = this.keymapVisible
      ? keymap.split(`\n`).length + KEY_PADDING
      : PADDING;
    return this.environment.height - sliceLines;
  }

  private async runner() {
    while (this.continuous || this.runTicks > NONE) {
      this.runTicks--;
      this.boardTick();
      await sleep(SPEED);
    }
  }

  private async sendState(): Promise<void> {
    await this.fetch.setGrid(
      this.board.map(i => {
        return i.map(cell => (cell ? COLOR_OFF : this.config.color));
      }),
    );
  }
}