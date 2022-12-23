import { Injectable } from "@nestjs/common";
import chalk from "chalk";

import { MenuComponentService } from "../components";
import { ApplicationManagerService } from "./application-manager.service";
import { PromptService } from "./prompt.service";
import { ScreenService } from "./screen.service";
import { TextRenderingService } from "./text-rendering.service";

@Injectable()
export class ErrorService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
  ) {}

  /**
   * Build an error to show that the last result returned by the menu component has fallen into an unknown catch-all scenario.
   * "Let the dev know about this condition, because they forgot to implement it!"
   *
   * Intended to be combined with type guards
   *
   * ```typescript
   * // ... string result logic ...
   * if( is.string(result) ) {
   *   await error.menuError();
   *   return;
   * }
   * // ... non-string result logic ...
   * ```
   */
  public async menuError(): Promise<void> {
    this.application.reprintHeader();
    this.screen.printLine(
      [
        chalk`{red.bold The menu returned an unhandled result}`,
        chalk`{cyan Please report this information to the developer}`,
      ].join(`\n`),
    );
    // eslint-disable-next-line no-console
    console.trace();
    this.screen.printLine(this.text.type(MenuComponentService.LAST_RESULT));
    await this.prompt.acknowledge();
  }
}
