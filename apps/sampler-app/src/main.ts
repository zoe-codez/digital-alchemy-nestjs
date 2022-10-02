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

interface TestItem {
  boolean: boolean;
  number: number;
  string: string;
}

// @QuickScript is derived from @Module from NestJS
// imports, providers, controllers all work as expected
//
// After bootstrapping, it will automatically run `exec` on the annotated class
//
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
    this.application.setHeader("Sampler App");
    const result = await this.prompt.arrayBuilder<TestItem>({
      current: [
        // {
        //   boolean: false,
        //   number: 5,
        //   string: "foo",
        // },
      ],
      elements: [
        {
          default: 5,
          helpText: "A magic number",
          name: "Number",
          path: "number",
          type: "number",
        },
        {
          helpText: "some string",
          name: "String",
          path: "string",
          type: "string",
        },
        {
          helpText: "Foo",
          name: "Boolean",
          path: "boolean",
          type: "boolean",
        },
      ],
      noRowsMessage: "Enter some shit",
    });
    console.log(result);
    await this.prompt.acknowledge();
    return;
    const action = await this.prompt.menu({
      condensed: true,
      hideSearch: true,
      keyMap: { d: ["done"] },
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
