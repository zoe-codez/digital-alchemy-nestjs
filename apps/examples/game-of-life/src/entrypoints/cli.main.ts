import {
  LIB_BOILERPLATE,
  LOG_LEVEL,
  QuickScript,
} from "@digital-alchemy/boilerplate";
import { RGBMatrixModule } from "@digital-alchemy/rgb-matrix";
import { ApplicationManagerService, TTYModule } from "@digital-alchemy/tty";

import { ConwayService, GameOfLifeComponentService } from "../services";

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
  imports: [RGBMatrixModule, TTYModule],
  providers: [ConwayService, GameOfLifeComponentService],
})
export class GameOfLifeCLI {
  constructor(private readonly application: ApplicationManagerService) {}

  public async exec(): Promise<void> {
    await this.application.activateComponent("game-of-life");
  }
}
