import { Injectable } from "@nestjs/common";
import {
  ApplicationManagerService,
  PromptService,
  ScreenService,
  TextRenderingService,
} from "@steggy/tty";

@Injectable()
export class BooleanService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
  ) {}

  public async basicInteraction(): Promise<void> {
    this.application.setHeader("Boolean");
    const result = await this.prompt.boolean({
      label: "Pineapple is acceptable on pizza?",
    });
    this.screen.print(this.text.type(result));
    this.screen.printLine(result ? "" : `, it really is tho`);
    await this.prompt.acknowledge();
  }
}
