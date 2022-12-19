/* eslint-disable radar/no-duplicate-string */
import { faker } from "@faker-js/faker";
import { QuickScript } from "@steggy/boilerplate";
import {
  ApplicationManagerService,
  PromptService,
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
  ItemGeneratorService,
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
    MenuService,
    ItemGeneratorService,
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
    private readonly confirm: ConfirmService,
    private readonly configSampler: ConfigSampler,
    private readonly date: DateService,
    private readonly menu: MenuService,
    private readonly object: ObjectService,
    private readonly pickMany: PickManyService,
    private readonly prompt: PromptService,
    private readonly string: StringService,
  ) {}

  public async exec(): Promise<void> {
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
          entry: ["Basic", "confirm_basic"],
          helpText: "boolean, but different",
          type: "Confirm",
        },
        {
          entry: ["Configurable", "date_configurable"],
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
          entry: ["Basic", "date_basic"],
          helpText: chalk`No options date prompt`,
          type: "Date",
        },
        {
          entry: ["Default operation", "pick_many_basic"],
          helpText: chalk`Pick many items out of a source list.`,
          type: "Pick Many",
        },
        {
          entry: ["Some selected", "pick_many_selected"],
          helpText: chalk`Pick many items out of a source list.\nSome are selected by default`,
          type: "Pick Many",
        },
        {
          entry: ["Configurable", "menu_configurable"],
          helpText: `Build your own example menu`,
          type: "Menu",
        },
        {
          entry: ["Position restore", "position_restore"],
          helpText: `Entries change every time, but menu will restore to the same position each time`,
          type: "Menu",
        },
        {
          entry: ["Value restore", "value_restore"],
          helpText: `Entries change every time, but menu will restore to the same value each time.\nData has sequential ids, but `,
          type: "Menu",
        },
        {
          entry: ["Async", "menu_async"],
          helpText: [
            `Run code in the background, while still keeping the menu rendered.`,
            `Return response messages to console`,
          ].join(`\n`),
          type: "Menu",
        },
        {
          entry: ["Advanced", "menu_advanced"],
          helpText: `A complex usage example. Utilizes font awesome icons`,
          type: "Menu",
        },
        {
          entry: ["Basic", "object_builder_basic"],
          helpText: chalk`{yellow User configurable demo WIP}.\nGenerate simple objects`,
          type: "Object Builder",
        },
        {
          entry: ["Default options", "string_basic"],
          helpText: "Request text from the user",
          type: "String",
        },
        {
          entry: ["Configurable", "string_configurable"],
          helpText: "Request text from the user",
          type: "String",
        },
      ],
      leftHeader: "Editors",
      restore: {
        id: "SAMPLER_APP_MAIN",
        type: "value",
      },
      right: [
        {
          entry: ["Configuration", "config"],
          helpText: chalk`Demo of {green.dim @steggy} Injected configurations`,
          type: "Configuration",
        },
      ],
      rightHeader: "Configuration",
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
        await this.date.basic();
        break;
      case "date_configurable":
        await this.date.configurable();
        break;
      case "menu_configurable":
        await this.menu.configurable();
        break;
      case "menu_advanced":
        await this.menu.advanced();
        break;
      case "menu_async":
        await this.menu.async();
        break;
      case "object_builder_basic":
        await this.object.basicInteraction();
        break;
      case "pick_many_basic":
        await this.pickMany.defaultOperation();
        break;
      case "confirm_basic":
        await this.confirm.basicInteraction();
        break;
      case "pick_many_selected":
        await this.pickMany.someSelected();
        break;
      case "done":
        return;
      case "config":
        await this.configSampler.exec();
        break;
      case "string_basic":
        await this.string.basicInteraction();
        break;
      case "string_configurable":
        await this.string.fullyConfigurable();
        break;
      case "position_restore":
        await this.menu.positionalRestore();
        break;
      case "value_restore":
        await this.menu.valueRestore();
        break;
    }
    await this.exec();
  }
}
