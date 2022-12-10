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

@Injectable()
export class DateService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
  ) {}

  public async basicInteraction(): Promise<void> {
    this.application.setHeader("Date");
    const options = await this.prompt.objectBuilder<DateEditorEditorOptions>({
      current: {
        fuzzy: "user",
        label: "Enter date",
        type: "datetime",
      },
      elements: [
        {
          name: "Fuzzy",
          options: Object.values(TTYFuzzyTypes).map(i => ({ entry: [i] })),
          path: "fuzzy",
          type: "pick-one",
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
