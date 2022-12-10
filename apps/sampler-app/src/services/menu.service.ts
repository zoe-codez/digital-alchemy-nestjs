import { Injectable } from "@nestjs/common";
import {
  ApplicationManagerService,
  PromptService,
  ScreenService,
  TextRenderingService,
} from "@steggy/tty";

@Injectable()
export class MenuService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
  ) {}

  public async basicInteraction(): Promise<void> {
    //
  }
}
