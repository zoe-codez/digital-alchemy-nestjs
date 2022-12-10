/* eslint-disable radar/no-duplicate-string */
import { faker } from "@faker-js/faker";
import { QuickScript } from "@steggy/boilerplate";
import {
  ApplicationManagerService,
  PromptService,
  ScreenService,
  TTYModule,
} from "@steggy/tty";
import chalk from "chalk";

import {
  AcknowledgeService,
  ArrayService,
  BooleanService,
  ConfigSampler,
  ConfirmService,
  DateService,
  MenuSampler,
  MenuService,
  ObjectService,
  PickManyService,
  StringService,
} from "./services";

@QuickScript({
  application: Symbol("sampler-app"),
  bootstrap: {
    config: {
      application: { APPLICATION_OVERRIDE: faker.hacker.phrase() },
    },
  },
  imports: [TTYModule],
  providers: [
    AcknowledgeService,
    ArrayService,
    BooleanService,
    ConfigSampler,
    ConfirmService,
    DateService,
    MenuSampler,
    MenuService,
    ObjectService,
    PickManyService,
    StringService,
  ],
})
export class SamplerApp {
  constructor(
    private readonly acknowledge: AcknowledgeService,
    private readonly application: ApplicationManagerService,
    private readonly array: ArrayService,
    private readonly boolean: BooleanService,
    private readonly configSampler: ConfigSampler,
    private readonly date: DateService,
    private readonly menu: MenuSampler,
    private readonly object: ObjectService,
    private readonly pickMany: PickManyService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
  ) {}

  public async exec(value?: string): Promise<void> {
    this.application.setHeader("TTY Demo", "Main Menu");
    const action = await this.prompt.menu({
      condensed: true,
      hideSearch: true,
      keyMap: {
        c: {
          entry: ["config"],
          highlight: "auto",
        },
        escape: ["done"],
        p: {
          entry: ["prompts"],
          highlight: "auto",
        },
      },
      left: [
        {
          entry: ["Basic", "array_basic"],
          helpText:
            "The unholy union of the menu and object builder prompts to create an array builder.",
          type: "Array",
        },
        {
          entry: ["Basic", "acknowledge_default"],
          helpText: "A basic request for interaction before continuing",
          type: "Acknowledge",
        },
        {
          entry: ["Custom Message", "acknowledge_custom"],
          helpText:
            "Present a custom message to the user, and force interaction before allowing code to continue",
          type: "Acknowledge",
        },
        {
          entry: ["Basic", "boolean"],
          helpText: "true / false",
          type: "Boolean",
        },
        {
          entry: ["Basic", "confirm"],
          helpText: "boolean, but different",
          type: "Confirm",
        },
        {
          entry: ["Basic", "date_basic"],
          helpText: chalk`Has support for {bold chrono-node} text parsing.\nDate modes: ${[
            "date",
            "time",
            "datetime",
            "range",
          ]
            .map(i => chalk.cyan(i))
            .join(", ")}`,
          type: "Date",
        },
        {
          entry: ["Basic", "pick_many_basic"],
          helpText: chalk`Pick many items out of a source list.`,
          type: "Pick Many",
        },
        {
          entry: ["Sampler", "menu_sampler"],
          helpText: chalk`General workhorse component. Highly configurable`,
          type: "Menu",
        },
        {
          entry: ["Basic", "object_builder_basic"],
          helpText: chalk`{yellow User configurable demo WIP}.\nGenerate simple objects`,
          type: "Object Builder",
        },
        {
          entry: ["Basic", "string"],
          helpText: "Request text from the user",
          type: "String",
        },
      ],
      leftHeader: "Editors",
      right: [
        {
          entry: ["Configuration", "config"],
          helpText: chalk`Demo of {green.dim @steggy} Injected configurations`,
          type: "Configuration",
        },
      ],
      rightHeader: "Configuration",
      value,
    });
    switch (action) {
      case "acknowledge_default":
        await this.acknowledge.basicInteraction();
        break;
      case "acknowledge_custom":
        await this.acknowledge.customMessage();
        break;
      case "array_basic":
        await this.array.basicInteraction();
        break;
      case "boolean":
        await this.boolean.basicInteraction();
        break;
      case "date_basic":
        await this.date.basicInteraction();
        break;
      case "menu_sampler":
        await this.menu.exec();
        break;
      case "object_builder_basic":
        await this.object.basicInteraction();
        break;
      case "pick_many_basic":
        await this.pickMany.basicInteraction();
        break;
      case "done":
        return;
      case "config":
        await this.configSampler.exec();
        break;
    }
    return await this.exec(action);
  }
}
