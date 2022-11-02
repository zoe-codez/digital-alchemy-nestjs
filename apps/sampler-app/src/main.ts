/* eslint-disable radar/no-duplicate-string */
import { faker } from "@faker-js/faker";
import { QuickScript } from "@steggy/boilerplate";
import {
  ApplicationManagerService,
  PromptService,
  TTYModule,
} from "@steggy/tty";
import chalk from "chalk";

import { ConfigSampler, MenuSampler, PromptSampler } from "./services";

@QuickScript({
  application: Symbol("sampler-app"),
  bootstrap: {
    config: {
      application: { APPLICATION_OVERRIDE: faker.hacker.phrase() },
    },
  },
  imports: [TTYModule],
  providers: [ConfigSampler, MenuSampler, PromptSampler],
})
export class SamplerApp {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly promptSampler: PromptSampler,
    private readonly configSampler: ConfigSampler,
  ) {}

  public async exec(value?: string): Promise<void> {
    await this.promptSampler.exec();
    this.application.setHeader("Sampler App");
    const action = await this.prompt.menu({
      condensed: true,
      hideSearch: true,
      keyMap: {
        c: {
          entry: ["config"],
          highlight: {
            normal: chalk.green.dim,
            valueMatch: chalk.green.bold,
          },
        },
        escape: ["done"],
        p: {
          entry: ["prompts"],
          highlight: {
            normal: chalk.green.dim,
            valueMatch: chalk.green.bold,
          },
        },
      },
      right: [
        {
          entry: ["Prompts", "prompts"],
          helpText: chalk`Non-comprehensive demo of the interactions provided by {green.dim @steggy/tty}`,
        },
        {
          entry: ["Configuration", "config"],
          helpText: chalk`Demo of {green.dim @steggy} Injected configurations`,
        },
      ],
      value,
    });
    switch (action) {
      case "done":
        return;
      case "prompts":
        await this.promptSampler.exec();
        break;
      case "config":
        await this.configSampler.exec();
        break;
    }
    return await this.exec(action);
  }
}
