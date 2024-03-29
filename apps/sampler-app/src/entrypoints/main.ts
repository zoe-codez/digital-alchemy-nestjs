/* eslint-disable sonarjs/no-duplicate-string */
import { QuickScript } from "@digital-alchemy/boilerplate";
import { RenderUtilitiesModule } from "@digital-alchemy/render-utils";
import {
  ApplicationManagerService,
  ErrorService,
  PromptService,
  TTYModule,
} from "@digital-alchemy/tty";
import { faker } from "@faker-js/faker";
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
} from "../services";

@QuickScript({
  application: "sampler-app",
  bootstrap: {
    application: {
      config: {
        application: { APPLICATION_OVERRIDE: faker.hacker.phrase() },
      },
    },
  },
  imports: [TTYModule, RenderUtilitiesModule],
  providers: [
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
  ],
})
export class SamplerApp {
  constructor(
    private readonly acknowledge: AcknowledgeService,
    private readonly application: ApplicationManagerService,
    private readonly array: ArrayService,
    private readonly boolean: BooleanService,
    private readonly configSampler: ConfigSampler,
    private readonly confirm: ConfirmService,
    private readonly date: DateService,
    private readonly error: ErrorService,
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
          // intended to use the `default` case
          entry: [chalk.strikethrough`Not implemented`, "missing_menu"],
          helpText: [
            "A canned error which indicates a not-implemented condition",
            "Can be used with any instance of the menu",
          ],
          type: "Menu",
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
          ],
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
          helpText: chalk`Demo of {green.dim @digital-alchemy} Injected configurations`,
          type: "Configuration",
        },
      ],
      rightHeader: "Configuration",
      search: { enabled: false },
    });
    switch (action) {
      // * Menu
      case "position_restore":
        await this.menu.positionalRestore();
        break;
      case "value_restore":
        await this.menu.valueRestore();
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
      // * Acknowledge
      case "acknowledge_default":
        await this.acknowledge.basic();
        break;
      case "acknowledge_custom":
        await this.acknowledge.configurable();
        break;
      // * Array
      case "array_basic":
        await this.array.basic();
        break;
      // * Boolean
      case "boolean":
        await this.boolean.basic();
        break;
      // * Date
      case "date_basic":
        await this.date.basic();
        break;
      case "date_configurable":
        await this.date.configurable();
        break;
      // * Object Builder
      case "object_builder_basic":
        await this.object.basic();
        break;
      // * Confirm
      case "confirm_basic":
        await this.confirm.basic();
        break;
      // * Pick Many
      case "pick_many_basic":
        await this.pickMany.basic();
        break;
      case "pick_many_selected":
        await this.pickMany.someSelected();
        break;
      // * String
      case "string_basic":
        await this.string.basic();
        break;
      case "string_configurable":
        await this.string.configurable();
        break;
      // * Misc
      case "done":
        return;
      case "config":
        await this.configSampler.exec();
        break;
      default:
        await this.error.menuError();
    }
    await this.exec();
  }
}
