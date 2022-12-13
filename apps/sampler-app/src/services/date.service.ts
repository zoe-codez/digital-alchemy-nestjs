import { Injectable } from "@nestjs/common";
import {
  ApplicationManagerService,
  DateEditorEditorOptions,
  PromptService,
  ScreenService,
  TextRenderingService,
  TTYDateTypes,
  TTYFuzzyTypes,
} from "@steggy/tty";
import chalk from "chalk";

@Injectable()
export class DateService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
  ) {}

  public async basic(): Promise<void> {
    this.application.setHeader("Date");
    const result = await this.prompt.date();
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }

  public async configurable(): Promise<void> {
    this.application.setHeader("Date");
    const options = await this.prompt.objectBuilder<DateEditorEditorOptions>({
      current: {
        defaultStyle: "fuzzy",
        fuzzy: "user",
        label: "Enter date",
        type: "datetime",
      },
      elements: [
        {
          helpText: chalk`Current date, parsed by {bold.yellow dayjs} to set the default value for granular date editor`,
          path: "current",
          type: "string",
        },
        {
          helpText: "Default value for fuzzy date entry",
          path: "currentFuzzy",
          type: "string",
        },
        {
          options: [{ entry: ["fuzzy"] }, { entry: ["granular"] }],
          path: "defaultStyle",
          type: "pick-one",
        },
        {
          name: "Fuzzy",
          options: Object.values(TTYFuzzyTypes).map(i => ({ entry: [i] })),
          path: "fuzzy",
          type: "pick-one",
        },
        {
          helpText:
            "Help text. Code may implement as callback function, instead of hard coded value",
          path: "helpNotes",
          type: "string",
        },
        {
          name: "Label",
          path: "label",
          type: "string",
        },
        {
          name: "Date Type",
          options: Object.values(TTYDateTypes).map(i => ({ entry: [i] })),
          path: "type",
          type: "pick-one",
        },
      ],
    });
    const result = await this.prompt.date(options);
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }
}
