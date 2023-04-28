import {
  CacheService,
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
  PromptService,
  ScreenService,
  TableBuilderElement,
  TTYModule,
} from "@digital-alchemy/tty";
import { HALF, is, SECOND } from "@digital-alchemy/utilities";
import chalk from "chalk";

import { GameConfiguration, GridArray } from "../types";

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

const CACHE_KEY = "conway_matrix_config_cache";

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
})
export class GameOfLifeCLI {
  constructor(
    private readonly prompt: PromptService,
    private readonly application: ApplicationManagerService,
    private readonly cache: CacheService,
    private readonly screen: ScreenService,
    private readonly fetch: MatrixFetch,
  ) {}

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
    try {
      this.configuration ??= await this.fetchConfiguration();
    } catch {
      // trap-errors
    }

    const action = await this.prompt.menu({
      headerMessage: this.headerMessage,
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
        this.configuration = await this.fetchConfiguration();
        return await this.exec();
      case "color":
        await this.setColor();
        return await this.exec();
      case "ticks":
        return await this.exec();
      case "grid":
        return await this.exec();
    }
  }

  protected async onModuleInit() {
    this.configuration = await this.cache.get(CACHE_KEY);
  }

  private async fetchConfiguration(): Promise<GameConfiguration> {
    return await this.fetch.fetch({
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
