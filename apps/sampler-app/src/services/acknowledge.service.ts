import {
  ApplicationManagerService,
  PromptService,
  ScreenService,
} from "@digital-alchemy/tty";
import { Injectable } from "@nestjs/common";
import chalk from "chalk";

@Injectable()
export class AcknowledgeService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
  ) {}

  public async basic(): Promise<void> {
    this.application.setHeader("Default Acknowledge");
    this.screen.printLine(
      chalk`\n {bold.blue ?} Below is the acknowledge prompt. \nIt does not require any particular interaction, any valid keyboard event works.\n \n `,
    );
    await this.prompt.acknowledge();
  }

  public async configurable(): Promise<void> {
    this.application.setHeader("Custom Acknowledge");
    const label = await this.prompt.string({ label: "Acknowledge message" });
    this.screen.printLine(`\n \n `);
    await this.prompt.acknowledge({ label });
  }
}
