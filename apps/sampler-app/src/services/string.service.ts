import { Injectable } from "@nestjs/common";
import {
  ApplicationManagerService,
  PromptService,
  ScreenService,
  TextRenderingService,
} from "@steggy/tty";

@Injectable()
export class StringService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
  ) {}

  public async basicInteraction(): Promise<void> {
    this.application.setHeader("String");
    const result = await this.prompt.string({
      label: "Requesting some text",
      placeholder: "placeholder text",
    });
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }

  public async fullyConfigurable(): Promise<void> {
    //
  }
}
