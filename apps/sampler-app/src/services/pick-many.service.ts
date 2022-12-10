import { faker } from "@faker-js/faker";
import { Injectable } from "@nestjs/common";
import {
  ApplicationManagerService,
  MainMenuEntry,
  PromptService,
  ScreenService,
  TextRenderingService,
} from "@steggy/tty";
import { HALF, PEAT } from "@steggy/utilities";

const LIST_LENGTH = 10;

@Injectable()
export class PickManyService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
  ) {}

  public async basicInteraction(): Promise<void> {
    this.application.setHeader("List Builder");
    const action = await this.prompt.menu({
      condensed: true,
      right: [
        { entry: ["default"] },
        { entry: ["some selected", "selected"] },
        { entry: ["custom label", "label"] },
      ],
    });
    const source = PEAT(LIST_LENGTH).map(i => {
      const element = faker.science.chemicalElement();
      return {
        entry: [element.name, `${i}`],
        helpText:
          Math.random() > HALF
            ? `${element.atomicNumber} ${element.symbol}`
            : undefined,
      } as MainMenuEntry<string>;
    });
    let result: string[];
    switch (action) {
      case "default":
        result = await this.prompt.pickMany({
          source,
        });
        break;
      case "selected":
        result = await this.prompt.pickMany({
          current: PEAT(LIST_LENGTH).map(i => {
            const element = faker.science.chemicalElement();
            return {
              entry: [element.name, `${i}`],
              helpText: `${element.atomicNumber} ${element.symbol}`,
            } as MainMenuEntry<string>;
          }),
          source,
        });
        break;
      case "label":
        const items = await this.prompt.string({ label: "Label" });
        result = await this.prompt.pickMany({ items, source });
        break;
    }
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }
}
