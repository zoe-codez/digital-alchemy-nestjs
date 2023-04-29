/**
 * # TODO
 *
 * ~ Only render changes, not full screen. This is a big performance hit
 */
import { InjectConfig } from "@digital-alchemy/boilerplate";
import { MatrixFetch, MAX_BRIGHTNESS, RGB } from "@digital-alchemy/rgb-matrix";
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
  TableBuilderElement,
  TextRenderingService,
  TTYComponentKeymap,
} from "@digital-alchemy/tty";
import {
  ARRAY_OFFSET,
  INCREMENT,
  is,
  NONE,
  PEAT,
  sleep,
  START,
} from "@digital-alchemy/utilities";
import chalk from "chalk";
import { nextTick } from "process";

import { COLOR_OFF, GameOfLifeSettings } from "../types";
import { ConwayService } from "./conway.service";

const ICON_RENDER = `🧮`;
const ICON_TOGGLE = `🪄`;
const ICON_SETTINGS = `⚙️`;
const ICON_CURSOR = `🖱️`;

const KEYMAP: TTYComponentKeymap = new Map([
  [
    { description: `${ICON_CURSOR}cursor down  `, key: ["down", "s"] },
    "cursorDown",
  ],
  [{ description: `⏹️done  `, key: "f4" }, "done"],
  [{ description: `⏮️reset  `, key: "f5" }, "reset"],
  [
    { description: `${ICON_TOGGLE}keymap visibility  `, key: "f6" },
    "toggleKeymap",
  ],
  [
    { description: `${ICON_TOGGLE}verify matrix connection  `, key: "f10" },
    "checkConnection",
  ],
  [{ description: `${ICON_TOGGLE}debug  `, key: "f7" }, "toggleDebug"],
  [{ description: `${ICON_SETTINGS}configure  `, key: "f8" }, "settings"],
  [
    { description: `${ICON_TOGGLE}advanced debug  `, key: "f9" },
    "toggleAdvancedDebug",
  ],
  [
    { description: `${ICON_CURSOR}cursor left  `, key: ["left", "a"] },
    "cursorLeft",
  ],
  [{ description: `${ICON_RENDER}render batch`, key: "r" }, "runBatch"],
  [
    { description: `${ICON_CURSOR}cursor right  `, key: ["right", "d"] },
    "cursorRight",
  ],
  [{ description: `🔁render continuous`, key: "c" }, "toggleContinuous"],
  [{ description: `🔀toggle cell`, key: "space" }, "toggle"],
  [{ description: `🔂render tick`, key: "t" }, "tick"],
  [{ description: `${ICON_CURSOR}cursor up  `, key: ["up", "w"] }, "cursorUp"],
]);
const SPEED = 50;
const RUN_TICKS = 100;
const PADDING = 2;
const KEY_PADDING = 3;

const DEFAULT_COLOR: RGB = {
  b: MAX_BRIGHTNESS,
  g: MAX_BRIGHTNESS,
  r: MAX_BRIGHTNESS,
};
const RANGE = "0-100";
const COLORS = {
  b: "Blue",
  g: "Green",
  r: "Red",
} as const;
const RGB_ELEMENTS = Object.keys(COLORS).map(
  (path: keyof typeof COLORS): TableBuilderElement<RGB> => ({
    helpText: RANGE,
    name: COLORS[path],
    path,
    type: "number",
  }),
);

@Component({ type: "game-of-life" })
export class GameOfLifeComponentService implements iComponent {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly conway: ConwayService,
    private readonly environment: EnvironmentService,
    private readonly fetch: MatrixFetch,
    private readonly keyboard: KeyboardManagerService,
    private readonly keymap: KeymapService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
    @InjectConfig("DEFAULT_MINIMUM_WIDTH", {
      default: 250,
      type: "number",
    })
    private readonly defaultMinWidth: number,
    @InjectConfig("DEFAULT_MINIMUM_HEIGHT", {
      default: 250,
      type: "number",
    })
    private readonly defaultMinHeight: number,
    @InjectConfig("DEFAULT_TOP", {
      default: 20,
      type: "number",
    })
    private readonly defaultTop: number,
    @InjectConfig("DEFAULT_LEFT", {
      default: 20,
      type: "number",
    })
    private readonly defaultLeft: number,
  ) {}

  /**
   * display neighbor counts
   */
  private advancedDebug = false;

  /**
   * the current state
   */
  private board: boolean[][];

  /**
   * color to use for alive cells
   */
  private color: RGB = { ...DEFAULT_COLOR };

  /**
   * is a pi matrix reachable?
   */
  private connected = false;

  /**
   * keep performing ticks
   */
  private continuous = false;

  /**
   * cursor position
   */
  private cursorX = START;

  /**
   * cursor position
   */
  private cursorY = START;

  /**
   * show help notes to describe the current state
   */
  private debug = false;

  /**
   * component complete callback
   */
  private done: ComponentDoneCallback;

  /**
   * ticks performed since last reset
   */
  private frame = START;

  /**
   * ! not constructively used
   */
  private isDone = false;

  /**
   * give more room in the console viewport by hiding keymap
   */
  private keymapVisible = false;

  /**
   * rendering top
   */
  private left = START;

  /**
   * enforce a board size larger than the visible area
   */
  private minHeight = NONE;

  /**
   * enforce a board size larger than the visible area
   */
  private minWidth = NONE;

  /**
   * batch run, decrements on tick
   */
  private runTicks = NONE;

  /**
   * sleep duration between ticks
   */
  private speed = SPEED;

  /**
   * rendering top
   */
  private top = START;

  /**
   * the game viewport width
   */
  private get width() {
    return this.environment.width - PADDING - PADDING;
  }

  /**
   * convert the 0-100 color scale used by pi matrix to a 0-255 terminal color
   *
   * TODO: adjust the foreground color based on brightness of background
   */
  private get chalkColor() {
    const { r, g, b } = this.color;
    return chalk.bgRgb((r / 100) * 255, (g / 100) * 255, (b / 100) * 255).black;
  }

  private get renderedKeymap() {
    return this.keymap.keymapHelp({
      maxLength: this.environment.width,
      notes: this.debug
        ? this.text.debug({
            frame: this.frame,
            height: this.minHeight,
            left: this.left,
            top: this.top,
            width: this.minWidth,
            x: this.cursorX,
            y: this.cursorY,
          })
        : undefined,
    });
  }

  /**
   * interface function for iComponent
   */
  public configure(_: unknown, callback: ComponentDoneCallback): void {
    // ? Application header (clear it)
    this.application.setHeader();
    // ? Set defaults
    this.minHeight = this.defaultMinHeight;
    this.left = this.defaultLeft;
    this.top = this.defaultTop;
    this.minWidth = this.defaultMinWidth;
    this.keymapVisible = true;
    this.color = DEFAULT_COLOR;
    this.isDone = false;
    this.continuous = false;
    this.advancedDebug = false;
    this.done = callback;
    this.frame = START;
    this.debug = false;
    this.speed = SPEED;
    this.reset(false);
    // ? Bind keyboard
    this.keyboard.setKeymap(this, KEYMAP);
    // ? Reset cursor
    this.cursorX = START;
    this.cursorY = START;
  }

  /**
   * interface function for iComponent - results in app exiting
   */
  public onEnd() {
    this.isDone = true;
    this.done();
  }

  /**
   * interface function for iComponent
   */
  public render(): void {
    const colorOn = this.chalkColor;
    const keymap = this.renderedKeymap;
    const height = this.getHeight(keymap);
    const message = this.board
      .slice(this.top, this.top + height)
      .map((row, rowIndex) => {
        return row
          .slice(this.left, this.left + this.width)
          .map((cell, cellIndex) => {
            const color = chalk.bgBlack;
            let char = this.advancedDebug
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

  protected async checkConnection() {
    this.application.setHeader("Checking connection");
    const exists = await this.fetch.exists();
    this.screen.printLine(
      exists
        ? chalk.green(`✅ Matrix is connected!`)
        : chalk.green(`❌ Cannot reach matrix`),
    );
    await this.prompt.acknowledge();
    this.application.setHeader();
    this.render();
  }

  /**
   * keypress handler - move cursor
   */
  protected cursorDown(): void {
    const height = this.getHeight();
    this.cursorY =
      this.cursorY === height - ARRAY_OFFSET ? START : this.cursorY + INCREMENT;
    this.render();
  }

  /**
   * keypress handler - move cursor
   */
  protected cursorLeft(): void {
    this.cursorX =
      this.cursorX === START
        ? this.width - ARRAY_OFFSET
        : this.cursorX - INCREMENT;
    this.render();
  }

  /**
   * keypress handler - move cursor
   */
  protected cursorRight(): void {
    this.cursorX =
      this.cursorX === this.width - ARRAY_OFFSET
        ? START
        : this.cursorX + INCREMENT;
    this.render();
  }

  /**
   * keypress handler - move cursor
   */
  protected cursorUp(): void {
    this.cursorY =
      this.cursorY === START
        ? this.getHeight() - ARRAY_OFFSET
        : this.cursorY - INCREMENT;
    this.render();
  }

  /**
   * keypress handler++ - reset board
   */
  protected reset(render = true): void {
    const row = PEAT(this.minWidth, false);
    this.board = PEAT(this.minHeight).map(() => [...row]);
    if (render) {
      this.render();
    }
  }

  /**
   * keypress handler - initiate a batch run
   */
  protected async runBatch(): Promise<void> {
    this.continuous = false;
    if (this.runTicks > NONE) {
      this.runTicks = NONE;
      return;
    }
    this.runTicks = RUN_TICKS;
    await this.runner();
  }

  /**
   * keypress handler - pull up the settings interface
   */
  protected async settings(): Promise<void> {
    this.application.setHeader("Game of Life", "Settings");
    const settings = await this.prompt.objectBuilder<
      GameOfLifeSettings,
      boolean
    >({
      cancel: false,
      current: { ...this.color, speed: this.speed },
      elements: [
        ...RGB_ELEMENTS,
        {
          helpText: "milliseconds",
          name: "Sleep time",
          path: "speed",
          type: "number",
        },
      ],
    });
    if (!is.boolean(settings)) {
      this.speed = settings.speed;
    }
    this.application.setHeader();
    this.render();
  }

  /**
   * keypress handler - increment the board
   */
  protected tick(): void {
    this.runTicks = NONE;
    this.continuous = false;
    this.boardTick();
  }

  /**
   * keypress handler - toggle life on an individual cell
   */
  protected toggle(): void {
    this.board[this.cursorY][this.cursorX] =
      !this.board[this.cursorY][this.cursorX];
    this.render();
  }

  /**
   * keypress handler - toggle advanced debugging visibility
   */
  protected toggleAdvancedDebug(): void {
    this.advancedDebug = !this.advancedDebug;
    this.render();
  }

  /**
   * keypress handler - toggle continuous run mode
   */
  protected async toggleContinuous(): Promise<void> {
    this.continuous = !this.continuous;
    this.render();
    await this.runner();
  }

  /**
   * keypress handler - toggle visibility of extra debug data
   */
  protected toggleDebug(): void {
    this.debug = !this.debug;
    this.render();
  }

  /**
   * keypress handler - toggle keymap visibility
   */
  protected toggleKeymap(): void {
    this.keymapVisible = !this.keymapVisible;
    this.render();
  }

  /**
   * perform tick & send state to matrix
   */
  private boardTick(): void {
    this.board = this.conway.tick(this.board);
    this.frame++;
    this.render();
    nextTick(async () => await this.sendState());
  }

  /**
   * calculate viewport height
   */
  private getHeight(keymap?: string) {
    keymap ??= this.renderedKeymap;
    const sliceLines = this.keymapVisible
      ? keymap.split(`\n`).length + KEY_PADDING
      : PADDING;
    return this.environment.height - sliceLines;
  }

  /**
   * run board ticks as long as it makes sense, with pauses in between
   */
  private async runner() {
    while (this.continuous || this.runTicks > NONE) {
      this.runTicks--;
      this.boardTick();
      await sleep(this.speed);
    }
  }

  /**
   * send the current state to the pi matrix
   */
  private async sendState(): Promise<void> {
    if (!this.connected) {
      return;
    }
    await this.fetch.setGrid(
      this.board.map(i => {
        return i.map(cell => (cell ? COLOR_OFF : this.color));
      }),
    );
  }
}
