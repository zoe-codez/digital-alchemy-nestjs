import {
  ApplicationManagerService,
  MainMenuEntry,
  PromptService,
  ScreenService,
  TextRenderingService,
} from "@digital-alchemy/tty";
import { HALF, PEAT } from "@digital-alchemy/utilities";
import { faker } from "@faker-js/faker";
import { Injectable } from "@nestjs/common";

const LIST_LENGTH = 10;

@Injectable()
export class PickManyService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
  ) {}

  /**
   * FIXME: this needs to have duplicates removed, the whole thing is a mess here
   */
  private get source(): MainMenuEntry<string>[] {
    return PEAT(LIST_LENGTH).map(() => {
      const element = faker.science.chemicalElement();
      return {
        entry: [element.name, element.symbol],
        helpText:
          Math.random() > HALF
            ? `${element.atomicNumber} ${element.symbol}`
            : undefined,
      } as MainMenuEntry<string>;
    });
  }

  public async defaultOperation(): Promise<void> {
    this.application.setHeader("List Builder");
    const result = await this.prompt.pickMany({
      source: [...this.source, ...this.source],
    });
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }

  public async someSelected(): Promise<void> {
    this.application.setHeader("List Builder");
    const source = this.source;
    const result = await this.prompt.pickMany({
      current: PEAT(LIST_LENGTH).map(() => {
        const element = faker.science.chemicalElement();
        return {
          entry: [element.name, element.symbol],
          helpText: `${element.atomicNumber} ${element.symbol}`,
        } as MainMenuEntry<string>;
      }),
      source,
    });
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }
}
