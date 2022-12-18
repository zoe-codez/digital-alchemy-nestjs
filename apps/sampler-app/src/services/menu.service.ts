/* eslint-disable radar/no-duplicate-string */
import { faker } from "@faker-js/faker";
import { Injectable } from "@nestjs/common";
import {
  ApplicationManagerService,
  ColorsService,
  FontAwesomeIcons,
  MainMenuCB,
  MainMenuEntry,
  MenuComponentOptions,
  PromptService,
  ScreenService,
  template,
  TextRenderingService,
  TTY,
} from "@steggy/tty";
import { is, PEAT, SECOND, SINGLE, sleep } from "@steggy/utilities";
import chalk from "chalk";

import { ItemGeneratorService } from "./item-generator.service";

type tMenuOptions = MenuComponentOptions & {
  generateCount: number;
} & Record<"optionsLeft" | "optionsRight", FakerSources>;
const CHUNKY_LIST = 50;
const MINI_LIST = 10;

/**
 * Just a few items to make life interesting
 */
enum FakerSources {
  bikes = "bikes",
  vin = "vin",
  none = "none",
  address = "address",
  filePath = "filePath",
  animal = "animal",
  product = "product",
}

const PRE_GENERATED_MENU: MainMenuEntry<string>[] = [];

PEAT(MINI_LIST).forEach(() =>
  PRE_GENERATED_MENU.push({
    entry: [faker.random.word()],
    type: "Word",
  }),
);
PEAT(MINI_LIST).forEach(() =>
  PRE_GENERATED_MENU.push({
    entry: [faker.system.filePath()],
    type: "File Path",
  }),
);
PEAT(MINI_LIST).forEach(() =>
  PRE_GENERATED_MENU.push({
    entry: [faker.vehicle.vin()],
    type: "VIN",
  }),
);
PEAT(MINI_LIST).forEach(() =>
  PRE_GENERATED_MENU.push({
    entry: [faker.commerce.productName()],
    type: "Product Name",
  }),
);
PEAT(MINI_LIST).forEach(() =>
  PRE_GENERATED_MENU.push({
    entry: [faker.address.streetAddress()],
    type: "Street Address",
  }),
);

type tAsyncExample = { color?: string; song?: string };
const DEFAULT_GENERATE = 50;
type AdvancedMenuResult = string | { type: string };

@Injectable()
export class MenuService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly colors: ColorsService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
    private readonly generator: ItemGeneratorService,
  ) {}

  private hiddenTypes: string[] = [];
  private menuOptions: tMenuOptions = {
    condensed: false,
    generateCount: DEFAULT_GENERATE,
    headerMessage: faker.company.catchPhrase(),
    hideSearch: false,
    keyOnly: false,
    leftHeader: "",
    optionsLeft: FakerSources.animal,
    optionsRight: FakerSources.filePath,
    rightHeader: "",
    showHeaders: true,
  };

  public async advanced(value?: AdvancedMenuResult): Promise<void> {
    this.application.setHeader("Advanced Example");
    const left = PRE_GENERATED_MENU.filter(
      ({ type }) => !this.hiddenTypes.includes(type),
    );
    const keyMapCallback: MainMenuCB<AdvancedMenuResult> = (key, [, value]) => {
      switch (key) {
        case "turn_on":
          selectedValue = value;
          this.hiddenTypes = [];
          return true;
        case "turn_off":
          selectedValue = value;
          this.hiddenTypes = is.unique(
            PRE_GENERATED_MENU.map(({ type }) => type),
          );
          return true;
        case "toggle":
          if (is.string(value)) {
            return `Can only toggle on type entries`;
          }
          selectedValue = value;
          this.hiddenTypes = this.hiddenTypes.includes(value.type)
            ? this.hiddenTypes.filter(i => i !== value.type)
            : [...this.hiddenTypes, value.type];
          return true;
      }
      return true;
    };
    const types = is.unique(PRE_GENERATED_MENU.map(({ type }) => type)).map(
      type =>
        ({
          entry: [type, { type }],
          icon: this.hiddenTypes.includes(type)
            ? chalk.red(FontAwesomeIcons.toggle_off)
            : chalk.green(FontAwesomeIcons.toggle_on),
          type: "Types",
        } as MainMenuEntry<{ type: string }>),
    );
    if (is.object(value)) {
      const type = value.type;
      value = TTY.GV(types.find(i => TTY.GV(i).type === type));
    }
    let selectedValue: AdvancedMenuResult;
    const result = await this.prompt.menu<string | { type: string }>({
      keyMap: {
        "[": [chalk.blue.dim("turn off all types"), "turn_off"],
        "]": [chalk.blue.dim("turn on all types"), "turn_on"],
        escape: ["done"],
        t: [chalk.blue.dim("toggle type visibility"), "toggle"],
      },
      keyMapCallback,
      left,
      leftHeader: chalk`Options ({gray ${left.length}} / {gray ${PRE_GENERATED_MENU.length}})`,
      restore: {
        id: "",
        idProperty: "type",
        type: "value",
      },
      right: [...types],
      rightHeader: "Filters",
      value,
    });

    switch (result) {
      case "turn_on":
      case "turn_off":
      case "toggle":
        return await this.advanced(selectedValue);
      case "done":
        return;
    }
    if (is.object(result)) {
      this.hiddenTypes = this.hiddenTypes.includes(result.type)
        ? this.hiddenTypes.filter(i => i !== result.type)
        : [...this.hiddenTypes, result.type];
      return await this.advanced(result);
    }
    await this.prompt.acknowledge();
  }

  public async async(): Promise<void> {
    this.application.setHeader("Async Example");
    const result = await this.prompt.menu<tAsyncExample>({
      condensed: true,
      headerMessage: [
        chalk` {yellow.bold ?} highlighted items have a {yellow 1} second delay on activation.`,
        chalk.gray`Messages persist {yellow.dim 2} seconds, then are cleared on next render.`,
        chalk.gray`Renders require user interaction.`,
      ].join(`\n`),
      keyMap: {
        a: [chalk.magenta.inverse("do a little dance"), "dance"],
        b: [chalk.magenta.inverse("paint some colors"), "colors"],
        escape: ["done"],
      },
      keyMapCallback: async (
        action,
        [label, value]: [string, tAsyncExample],
      ) => {
        if (!["dance", "colors"].includes(action)) {
          return false;
        }
        await sleep(SECOND);
        if (action === "dance") {
          return is.empty(value.song)
            ? chalk.red(`you are too sober to dance to colors`)
            : chalk`Dancing to {magenta ${label}}! {gray Value: ${value.song}}`;
        }

        return is.empty(value.color)
          ? chalk.cyan(`🤖 Silly human, songs aren't colors`)
          : chalk.bgHex(label)[
              this.colors.isBright(label.slice(SINGLE)) ? "black" : "white"
            ]`${label} is a ${faker.word.adjective()} color`;
      },
      left: PEAT(CHUNKY_LIST).map(i => ({
        entry: [faker.color.rgb(), { color: `${i}` }],
      })),
      leftHeader: "Colors",
      right: PEAT(CHUNKY_LIST).map(i => ({
        entry: [faker.music.songName(), { song: `${i}` }],
      })),
      rightHeader: "Songs",
    });
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }

  public async configurable(): Promise<void> {
    this.application.setHeader("Configurable example");
    const cancel = Date.now();
    const menuOptions = await this.prompt.objectBuilder<
      tMenuOptions,
      typeof cancel
    >({
      async cancel({ cancelFunction, confirm }) {
        const result = await confirm();
        if (!result) {
          return;
        }
        cancelFunction(cancel);
      },
      current: this.menuOptions,
      elements: [
        {
          helpText: [
            chalk`Hide some of the unnecessary keyboard shortcuts ({gray home}/{gray end}/{gray pageUp}/{gray pageDown})`,
            "Shortcuts will still work, for aesthetic purposes",
          ].join("\n"),
          name: "Condensed",
          path: "condensed",
          type: "boolean",
        },
        {
          helpText: "Remove the tab to toggle search option",
          name: "Hide Search",
          path: "hideSearch",
          type: "boolean",
        },
        {
          helpText: [
            "Prevent menu from printing warnings when a list is empty.",
            "Most useful when using menu as a keyboard shortcut only mode (no left/right entries).",
          ].join("\n"),
          name: "Key Only",
          path: "keyOnly",
          type: "boolean",
        },
        {
          helpText: "Display extra text at the top of the menu.",
          name: "Header Message",
          path: "headerMessage",
          type: "string",
        },
        {
          helpText: "Column header for left column",
          name: "Left Header",
          path: "leftHeader",
          type: "string",
        },
        {
          helpText: "Column header for right column",
          name: "Right Header",
          path: "rightHeader",
          type: "string",
        },
        {
          helpText: "Display column headers",
          name: "Show Headers",
          path: "showHeaders",
          type: "boolean",
        },
        {
          helpText: "Generate fake data",
          name: chalk.cyan("Options left"),
          options: Object.values(FakerSources).map(i => ({ entry: [i] })),
          path: "optionsLeft",
          type: "pick-one",
        },
        {
          helpText: "Generate fake data",
          name: chalk.cyan("Options right"),
          options: Object.values(FakerSources).map(i => ({ entry: [i] })),
          path: "optionsRight",
          type: "pick-one",
        },
        {
          helpText: "Generate fake data",
          name: chalk.cyan("Generate Options qty"),
          path: "generateCount",
          type: "number",
        },
      ],
    });
    if (!is.object(menuOptions)) {
      return;
    }
    this.menuOptions = menuOptions;
    const {
      optionsLeft,
      optionsRight,
      headerMessage,
      generateCount,
      ...options
    } = this.menuOptions;
    const left: MainMenuEntry[] =
      optionsLeft === FakerSources.none
        ? undefined
        : PEAT(generateCount).map(i =>
            this.generator.generateMenuItem(optionsLeft, `left-${i}`),
          );
    const right: MainMenuEntry[] =
      optionsRight === FakerSources.none
        ? undefined
        : PEAT(generateCount).map(i =>
            this.generator.generateMenuItem(optionsRight, `right-${i}`),
          );
    const message = template(headerMessage as string);
    const result = await this.prompt.menu({
      ...options,
      headerMessage: message,
      left,
      right,
    });
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }

  public async prettyShortcuts(): Promise<void> {
    this.application.setHeader("Pretty shortcuts");
    const result = await this.prompt.menu({
      condensed: true,
      hideSearch: true,
      keyMap: {
        a: {
          entry: ["auto"],
          highlight: "auto",
        },
        c: [chalk.green("i'm green!"), "green"],
        n: ["nothing special"],
        q: {
          entry: ["specific colors b", "specificB"],
          highlight: {
            normal: chalk.gray,
            valueMatch: chalk.magenta.bold,
          },
        },
        r: {
          entry: ["specific colors a", "specificA"],
          highlight: {
            normal: chalk.blue.bold,
            valueMatch: chalk.red.bold,
          },
        },
      },
      right: [
        { entry: ["auto"] },
        { entry: ["specific colors a", "specificA"] },
        { entry: ["specific colors b", "specificB"] },
        { entry: ["nothing special"] },
        { entry: [chalk.green("i'm green!"), "green"] },
      ],
    });
    this.screen.printLine(result);
    await this.prompt.acknowledge();
  }
}
