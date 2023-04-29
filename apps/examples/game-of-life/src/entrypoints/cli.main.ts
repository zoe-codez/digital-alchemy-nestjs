import {
  LIB_BOILERPLATE,
  LOG_LEVEL,
  QuickScript,
} from "@digital-alchemy/boilerplate";
import {
  MatrixFetch,
  MAX_BRIGHTNESS,
  OFF,
  RGB,
} from "@digital-alchemy/rgb-matrix";
import {
  ApplicationManagerService,
  EnvironmentService,
  PromptService,
  ScreenService,
  TableBuilderElement,
  TTYModule,
} from "@digital-alchemy/tty";
import { HALF, is, PEAT, SECOND } from "@digital-alchemy/utilities";
import chalk from "chalk";

import { ConwayService, GameOfLifeComponentService } from "../services";
import {
  GameConfiguration,
  GameOfLifeComponentOptions,
  GridArray,
} from "../types";

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
const DEFAULT_HEIGHT = 128;
const DEFAULT_WIDTH = 64;
const DEFAULT_SPEED = 100;

@QuickScript({
  application: "game-of-life-cli",
  bootstrap: {
    application: {
      config: {
        libs: {
          [LIB_BOILERPLATE]: { [LOG_LEVEL]: "silent" },
        },
      },
    },
  },
  imports: [TTYModule],
  providers: [MatrixFetch, ConwayService, GameOfLifeComponentService],
})
export class GameOfLifeCLI {
  constructor(
    private readonly prompt: PromptService,
    private readonly application: ApplicationManagerService,
    private readonly screen: ScreenService,
    private readonly environment: EnvironmentService,
    private readonly fetch: MatrixFetch,
  ) {
    const width = this.environment.width - 4;
    const row = PEAT(width, false);
    this.configuration = {
      color: {
        b: MAX_BRIGHTNESS,
        g: MAX_BRIGHTNESS,
        r: MAX_BRIGHTNESS,
      },
      grid: PEAT(DEFAULT_HEIGHT).map(() => [...row]),
      height: DEFAULT_HEIGHT,
      speed: DEFAULT_SPEED,
      width: width,
    };
  }

  private color: RGB = DEFAULT_COLOR;
  private configuration: GameConfiguration;
  private grid: GridArray;
  private tickTimeout = HALF * SECOND;

  private get headerMessage() {
    if (this.configuration) {
      return chalk.green(`✅ Matrix is connected!`);
    }
    return chalk.green(`❌ Cannot reach matrix`);
  }

  public async exec(): Promise<void> {
    this.application.setHeader("Game of Life");
    // await this.fetchConfiguration();
    await this.editGrid();

    const action = await this.prompt.menu({
      headerMessage: this.headerMessage,
      helpNotes: [],
      keyMap: {
        c: { entry: ["set color", "color"], highlight: "auto" },
        g: { entry: ["edit grid", "grid"], highlight: "auto" },
        r: { entry: ["refresh data", "refresh"], highlight: "auto" },
        t: { entry: ["set ticks", "ticks"], highlight: "auto" },
      },
      restore: { id: "GAME_OF_LIFE_MAIN_MENU", type: "value" },
      right: [
        { entry: ["refresh data", "refresh"] },
        { entry: ["set color", "color"] },
        { entry: ["set ticks", "ticks"] },
        { entry: ["edit grid", "grid"] },
      ],
      search: { enabled: false },
    });

    switch (action) {
      case "refresh":
        this.configuration = undefined;
        await this.fetchConfiguration();
        return await this.exec();
      case "color":
        await this.setColor();
        return await this.exec();
      case "ticks":
        return await this.exec();
      case "grid":
        await this.editGrid();
        return await this.exec();
    }
  }

  private async editGrid(): Promise<void> {
    await this.application.activateComponent("game-of-life", {
      ...this.configuration,
      sendExternal: false,
    } as GameOfLifeComponentOptions);
  }

  private async fetchConfiguration(): Promise<void> {
    this.configuration ??= await this.fetch.fetch({
      url: "/configuration",
    });
  }

  private async setColor(): Promise<void> {
    this.application.setHeader("Game of Life", "Set Color");
    const color = await this.prompt.objectBuilder<RGB, boolean>({
      cancel: false,
      current: this.color,
      elements: RGB_ELEMENTS,
      validate: ({ current }) =>
        Object.values(current).every(i => i <= MAX_BRIGHTNESS && i >= OFF),
    });
    if (!is.boolean(color)) {
      this.color = color;
      await this.fetch.fetch({
        body: { color },
        method: "post",
        url: "/color",
      });
    }
  }
}
