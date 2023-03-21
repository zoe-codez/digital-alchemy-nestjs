import { InjectConfig } from "@digital-alchemy/boilerplate";
import {
  ApplicationManagerService,
  DEFAULT_PROMPT_WIDTH,
  LIB_TTY,
  PromptService,
  ScreenService,
  StringEditorRenderOptions,
  TextRenderingService,
} from "@digital-alchemy/tty";
import { Injectable } from "@nestjs/common";

@Injectable()
export class StringService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
    @InjectConfig(DEFAULT_PROMPT_WIDTH, LIB_TTY)
    private readonly defaultWidth: number,
  ) {}

  public async basicInteraction(): Promise<void> {
    this.application.setHeader("String Value");
    const result = await this.prompt.string();
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }

  public async fullyConfigurable(): Promise<void> {
    this.application.setHeader("String", "Configure");
    const options = await this.prompt.objectBuilder<StringEditorRenderOptions>({
      current: {
        current: "",
        label: "",
        mask: undefined,
        placeholder: "",
        width: this.defaultWidth,
      },
      elements: [
        {
          path: "current",
          type: "string",
        },
        {
          path: "label",
          type: "string",
        },
        {
          default: "",
          options: [
            { entry: ["hide"] },
            { entry: ["obfuscate"] },
            { entry: ["none", ""] },
          ],
          path: "mask",
          type: "pick-one",
        },
        {
          path: "placeholder",
          type: "string",
        },
        {
          path: "width",
          type: "number",
        },
      ],
    });

    this.application.setHeader("String Value");
    const result = await this.prompt.string(options);
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }
}
