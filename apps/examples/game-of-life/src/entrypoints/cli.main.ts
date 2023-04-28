import {
  FetchService,
  InjectConfig,
  QuickScript,
} from "@digital-alchemy/boilerplate";
import { MAX_BRIGHTNESS, RGB } from "@digital-alchemy/rgb-matrix";
import { ADMIN_KEY_HEADER } from "@digital-alchemy/server";
import {
  ApplicationManagerService,
  PromptService,
  ScreenService,
  TTYModule,
} from "@digital-alchemy/tty";
import { FetchWith, HALF, is, SECOND } from "@digital-alchemy/utilities";

import {
  DEFAULT_AUTH_PASSWORD,
  GridArray,
  MatrixConfigurationResponse,
} from "../types";

type PartialFetch = Omit<FetchWith, "baseUrl" | "headers">;
const DEFAULT_COLOR: RGB = {
  b: MAX_BRIGHTNESS,
  g: MAX_BRIGHTNESS,
  r: MAX_BRIGHTNESS,
};

@QuickScript({
  application: "game-of-life-cli",
  imports: [TTYModule],
})
export class GameOfLifeCLI {
  constructor(
    private readonly prompt: PromptService,
    private readonly application: ApplicationManagerService,
    private readonly screen: ScreenService,
    private readonly fetchService: FetchService,
    @InjectConfig("MATRIX_BASE_URL", {
      default: "http://192.168.1.100:7000",
      description: "Base URL to target GameOfLifeClient",
      type: "string",
    })
    private readonly baseUrl: string,
    @InjectConfig("MATRIX_AUTH", {
      default: DEFAULT_AUTH_PASSWORD,
      description: "Matrix auth password",
      type: "string",
    })
    private readonly auth: string,
  ) {}

  private color: RGB = DEFAULT_COLOR;
  private configuration: MatrixConfigurationResponse;
  private grid: GridArray;
  private tickTimeout = HALF * SECOND;

  public async exec(): Promise<void> {
    this.application.setHeader("Game of Life");
    this.configuration ??= await this.fetchConfiguration();

    const action = await this.prompt.menu({
      keyMap: {
        c: { entry: ["set color", "color"], highlight: "auto" },
        r: { entry: ["refresh data", "refresh"], highlight: "auto" },
        t: { entry: ["set ticks", "ticks"], highlight: "auto" },
      },
      restore: { id: "GAME_OF_LIFE_MAIN_MENU", type: "value" },
      right: [
        { entry: ["refresh data", "refresh"] },
        { entry: ["set color", "color"] },
        { entry: ["set ticks", "ticks"] },
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
    }
  }

  private async fetch<T>(fetchWith: PartialFetch) {
    return await this.fetchService.fetch<T>({
      ...fetchWith,
      baseUrl: this.baseUrl,
      headers: { [ADMIN_KEY_HEADER]: this.auth },
    });
  }

  private async fetchConfiguration(): Promise<MatrixConfigurationResponse> {
    return await this.fetch({
      url: "/configuration",
    });
  }

  private async setColor(): Promise<void> {
    this.application.setHeader("Game of Life", "Set Color");
    const color = await this.prompt.objectBuilder<RGB, boolean>({
      cancel: false,
      current: this.color,
      elements: [
        {
          helpText: "0-100",
          name: "Red",
          path: "r",
          type: "number",
        },
        {
          helpText: "0-100",
          name: "Green",
          path: "g",
          type: "number",
        },
        {
          helpText: "0-100",
          name: "Blue",
          path: "b",
          type: "number",
        },
      ],
    });
    if (!is.boolean(color)) {
      this.color = color;
      await this.fetch({
        body: { color },
        method: "post",
        url: "/color",
      });
    }
  }
}
