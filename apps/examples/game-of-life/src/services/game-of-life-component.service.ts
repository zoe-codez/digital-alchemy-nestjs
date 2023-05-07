/**
 * # TODO
 *
 * ~ Only render changes, not full screen. This is a big performance hit
 */
import { CacheService, InjectConfig } from "@digital-alchemy/boilerplate";
import {
  MATRIX_STATE_CACHE_KEY,
  MatrixFetch,
  MatrixState,
  MAX_BRIGHTNESS,
  RGB,
} from "@digital-alchemy/rgb-matrix";
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
  HALF,
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

enum Palette {
  on = "1",
  off = "0",
}
enum Icons {
  render = `🧮`,
  toggle = `🪄`,
  settings = `⚙️`,
  cursor = `🖱️`,
  done = `⏹️`,
  reset = `⏮️`,
  continuous = `🔁`,
  toggle_cell = `🔀`,
  tick = `🔂`,
}

const KEYMAP: TTYComponentKeymap = new Map([
  [
    { description: `${Icons.cursor}cursor down  `, key: ["down", "s"] },
    "cursorDown",
  ],
  [{ description: `${Icons.done}done  `, key: "f4" }, "done"],
  [{ description: `${Icons.reset}reset  `, key: "f5" }, "reset"],
  [
    { description: `${Icons.toggle}keymap visibility  `, key: "f6" },
    "toggleKeymap",
  ],
  [
    { description: `${Icons.toggle}verify matrix connection  `, key: "f10" },
    "checkConnection",
  ],
  [{ description: `${Icons.toggle}debug  `, key: "f7" }, "toggleDebug"],
  [{ description: `${Icons.settings}configure  `, key: "f8" }, "settings"],
  [
    { description: `${Icons.toggle}advanced debug  `, key: "f9" },
    "toggleAdvancedDebug",
  ],
  [
    { description: `${Icons.cursor}cursor left  `, key: ["left", "a"] },
    "cursorLeft",
  ],
  [{ description: `${Icons.render}render batch`, key: "r" }, "runBatch"],
  [
    { description: `${Icons.cursor}cursor right  `, key: ["right", "d"] },
    "cursorRight",
  ],
  [
    { description: `${Icons.continuous}render continuous`, key: "c" },
    "toggleContinuous",
  ],
  [
    {
      description: `${Icons.toggle_cell}toggle cell`,
      key: ["space", "`", "e"],
    },
    "toggle",
  ],
  [{ description: `${Icons.tick}render tick`, key: "t" }, "tick"],
  [{ description: `${Icons.cursor}cursor up  `, key: ["up", "w"] }, "cursorUp"],
]);
const SPEED = 50;
const RUN_TICKS = 100;
const PADDING = 2;
const KEY_PADDING = 3;

const DEFAULT_COLOR: RGB = {
  b: MAX_BRIGHTNESS * HALF * HALF,
  g: MAX_BRIGHTNESS * HALF * HALF,
  r: MAX_BRIGHTNESS * HALF * HALF,
};
const RANGE = chalk`brightness on a {yellow 0}-{yellow 100} scale`;
const COLORS = {
  b: chalk.bgBlue(" ") + " Blue",
  g: chalk.bgGreen(" ") + " Green",
  r: chalk.bgRed(" ") + " Red",
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
    private readonly cache: CacheService,
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

  private batchSize = RUN_TICKS;

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
   * visible area for connected matrix
   */
  private matrixHeight = NONE;

  /**
   * visible area for connected matrix
   */
  private matrixWidth = NONE;

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
    return chalk.bgRgb(
      Math.floor((r / 100) * 255),
      Math.floor((g / 100) * 255),
      Math.floor((b / 100) * 255),
    ).black;
  }

  private get renderedKeymap() {
    return this.keymap.keymapHelp({
      maxLength: this.environment.width,
      notes: this.debug
        ? this.text.debug({
            connected: this.connected,
            frame: this.frame,
            height: this.minHeight,
            left: this.left,
            matrixHeight: this.matrixHeight,
            matrixWidth: this.matrixWidth,
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
   *
   * first parameter (options) is unused
   */
  public async configure(
    _: unknown,
    callback: ComponentDoneCallback,
  ): Promise<void> {
    // ? Application header (clear it)
    this.application.setHeader();
    // ? Set defaults
    await this.loadCache();
    this.keymapVisible = true;
    this.isDone = false;
    this.continuous = false;
    this.advancedDebug = false;
    this.done = callback;
    this.debug = false;
    // ? Bind keyboard
    this.keyboard.setKeymap(this, KEYMAP);
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
    const message = this.boardSlice(height)
      .map((row, rowIndex) =>
        row
          .map((cell, cellIndex) => {
            const color = chalk.bgBlack;
            // rowIndex += this.top;
            // cellIndex += this.left;
            let char = this.advancedDebug
              ? this.conway.neighbors(this.board, rowIndex, cellIndex)
              : " ";
            if (rowIndex === this.cursorY && cellIndex === this.cursorX) {
              char = chalk.red("*");
            }
            if (this.isOn(rowIndex, cellIndex)) {
              return colorOn(char);
            }
            return color(char);
          })
          .join(""),
      )
      .map(i => `  ${i}`)
      .join(`\n`);

    this.screen.render(message, this.keymapVisible ? keymap : undefined);
    nextTick(async () => await this.sync());
  }

  protected async checkConnection() {
    this.stop();
    this.application.setHeader("Checking connection");
    await this.matrixRefresh();
    this.screen.printLine(
      this.connected
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

  protected async onModuleInit() {
    await this.loadCache();
  }

  /**
   * keypress handler++ - reset board
   */
  protected reset(render = true): void {
    this.stop();
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
    this.stop();
    this.application.setHeader("Game of Life", "Settings");
    const settings = await this.prompt.objectBuilder<
      GameOfLifeSettings,
      boolean
    >({
      cancel: false,
      current: {
        ...this.color,
        batchSize: this.batchSize,
        left: this.left,
        minHeight: this.minHeight,
        minWidth: this.minWidth,
        speed: this.speed,
        top: this.top,
      },
      elements: [
        ...RGB_ELEMENTS,
        {
          helpText: "milliseconds",
          name: "Sleep time",
          path: "speed",
          type: "number",
        },
        {
          helpText: "Padding from left of calculated region",
          name: "Left",
          path: "left",
          type: "number",
        },
        {
          helpText:
            "Minimum height of calculated region (viewport will always calculate)",
          name: "Minimum height",
          path: "minHeight",
          type: "number",
        },
        {
          helpText:
            "Minimum width of calculated region (viewport will always calculate)",
          name: "Minimum width",
          path: "minWidth",
          type: "number",
        },
        {
          helpText: "Padding from top of calculated region",
          name: "Top",
          path: "top",
          type: "number",
        },
        {
          helpText: "How many ticks to run sequentially in batches",
          name: "Batch Size",
          path: "batchSize",
          type: "number",
        },
      ],
    });
    if (!is.boolean(settings)) {
      this.speed = settings.speed;
      this.color = {
        b: settings.b,
        g: settings.g,
        r: settings.r,
      };
      this.top = settings.top;
      this.left = settings.left;
      this.minHeight = settings.minHeight;
      this.minWidth = settings.minWidth;
      this.batchSize = settings.batchSize;
      await this.saveCacheState();
    }
    this.application.setHeader();
    this.render();
  }

  protected stop() {
    this.continuous = false;
    this.runTicks = NONE;
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
    const y = this.cursorY + this.top;
    const x = this.cursorX + this.left;
    this.board[y][x] = !this.board[y][x];
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
   * extract a rectangle from the board
   */
  private boardSlice(height: number, width = this.width) {
    return this.board
      .slice(this.top, this.top + height)
      .map(row => row.slice(this.left, this.left + width));
  }

  /**
   * perform tick & send state to matrix
   */
  private boardTick(): void {
    this.board = this.conway.tick(this.board);
    this.frame++;
    this.render();
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

  private isOn(rowIndex: number, cell: number): boolean {
    const row = this.board[rowIndex + this.top];
    if (!row) {
      return false;
    }
    return !!row[cell + this.left];
  }

  private async loadCache() {
    const state = await this.cache.get<MatrixState>(MATRIX_STATE_CACHE_KEY);
    if (!state) {
      return;
    }
    this.connected = state.connected;
    this.color = {
      b: state.b,
      g: state.g,
      r: state.r,
    };
    this.matrixHeight = state.height;
    this.matrixWidth = state.width;
    this.cursorX = state.cursorX;
    this.cursorY = state.cursorY;
    this.left = state.left;
    this.frame = state.frame;
    this.batchSize = state.batchSize;
    this.top = state.top;
    this.minWidth = state.minWidth;
    this.minHeight = state.minHeight;
    this.board = state.board;
  }

  private async matrixRefresh() {
    this.connected = await this.fetch.exists();
    if (this.connected) {
      const dimensions = await this.fetch.getDimensions();
      this.matrixHeight = dimensions.height;
      this.matrixWidth = dimensions.width;
    } else {
      this.matrixHeight = NONE;
      this.matrixWidth = NONE;
    }
    await this.saveCacheState();
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

  private async saveCacheState(): Promise<void> {
    await this.cache.set<MatrixState>(MATRIX_STATE_CACHE_KEY, {
      batchSize: this.batchSize,
      board: this.board,
      connected: this.connected,
      cursorX: this.cursorX,
      cursorY: this.cursorY,
      frame: this.frame,
      height: this.matrixHeight,
      left: this.left,
      minHeight: this.minHeight,
      minWidth: this.minWidth,
      speed: this.speed,
      top: this.top,
      width: this.matrixWidth,
      ...this.color,
    });
  }

  /**
   * send the current state to the pi matrix
   */
  private async sendState() {
    if (!this.connected) {
      return;
    }
    const grid = this.boardSlice(this.matrixHeight, this.matrixWidth);
    await this.fetch.setPixels({
      clear: true,
      grid: grid.map(row => row.map(i => (i ? Palette.on : Palette.off))),
      palette: {
        [Palette.off]: COLOR_OFF,
        [Palette.on]: this.color,
      },
    });
  }

  private async sync(): Promise<void> {
    await this.saveCacheState();
    await this.sendState();
  }
}
