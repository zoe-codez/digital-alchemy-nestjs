/* eslint-disable radar/no-identical-functions */
/* eslint-disable radar/no-duplicate-string */
import { faker } from "@faker-js/faker";
import { Injectable } from "@nestjs/common";
import {
  ApplicationManagerService,
  DateEditorEditorOptions,
  MainMenuEntry,
  PromptService,
  ScreenService,
  TextRenderingService,
  TTYDateTypes,
  TTYFuzzyTypes,
} from "@steggy/tty";
import { HALF, PEAT } from "@steggy/utilities";
import chalk from "chalk";

import { MenuSampler } from "./menu-sampler.service";

const LIST_LENGTH = 10;

@Injectable()
export class PromptSampler {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly menuSampler: MenuSampler,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
  ) {}

  public async exec(value?: string): Promise<void> {
    await this.objectBuilder();
    this.application.setHeader("TTY Sampler");

    const action = await this.prompt.menu({
      condensed: true,
      headerMessage: [
        chalk` {yellow.bold ?} Below is a selection of the interactions provided by {bold PromptService}.`,
        chalk` This service uses pre-built widgets to gather information from the user.`,
      ].join(`\n`),
      keyMap: {
        escape: ["done"],
      },
      right: [
        {
          entry: ["acknowledge"],
          helpText: "A basic request for interaction before continuing",
        },
        { entry: ["boolean"], helpText: "true / false" },
        { entry: ["confirm"], helpText: "boolean, but different" },
        {
          entry: ["date"],
          helpText: chalk`Has support for {bold chrono-node} text parsing.\nDate modes: ${[
            "date",
            "time",
            "datetime",
            "range",
          ]
            .map(i => chalk.cyan(i))
            .join(", ")}`,
        },
        {
          entry: ["lists"],
          helpText: chalk`Pick many items out of a source list.`,
        },
        {
          entry: ["menu"],
          helpText: chalk`General workhorse component. Highly configurable`,
        },
        {
          entry: ["object builder", "builder"],
          helpText: chalk`{yellow User configurable demo WIP}.\nGenerate simple objects`,
        },
        { entry: ["string"], helpText: "Request text from the user" },
      ],
      value,
    });
    switch (action) {
      case "acknowledge":
        await this.acknowledge();
        return await this.exec(action);
      case "boolean":
        await this.boolean();
        return await this.exec(action);
      case "confirm":
        await this.confirm();
        return await this.exec(action);
      case "date":
        await this.date();
        return await this.exec(action);
      case "lists":
        await this.lists();
        return await this.exec(action);
      case "builder":
        await this.objectBuilder();
        return await this.exec(action);
      case "menu":
        await this.menuSampler.exec();
        return await this.exec(action);
      case "string":
        await this.string();
        return await this.exec(action);
      case "done":
        return;
    }
  }

  private async acknowledge(): Promise<void> {
    this.application.setHeader("Acknowledge");
    const action = await this.prompt.pickOne({
      headerMessage: "Type",
      options: [
        { entry: ["custom text", "custom"] },
        { entry: ["default text", "default"] },
      ],
    });
    switch (action) {
      case "custom":
        const message = await this.prompt.string({ label: "Message" });
        this.application.setHeader("Custom Acknowledge");
        this.screen.printLine(`\n \n `);
        await this.prompt.acknowledge({ label: message });
        return;
      case "default":
        this.application.setHeader("Default Acknowledge");
        this.screen.printLine(`\n \n `);
        await this.prompt.acknowledge();
        return;
    }
  }

  private async boolean(): Promise<void> {
    this.application.setHeader("Boolean");
    const result = await this.prompt.boolean({
      label: "Pineapple is acceptable on pizza?",
    });
    this.screen.print(this.text.type(result));
    this.screen.printLine(result ? "" : `, it really is tho`);
    await this.prompt.acknowledge();
  }

  private async confirm(): Promise<void> {
    const action = await this.prompt.menu({
      condensed: true,
      right: [
        { entry: ["custom text", "custom"] },
        { entry: ["default"] },
        { entry: ["custom default state", "state"] },
      ],
    });
    let result: boolean;
    switch (action) {
      case "custom":
        const text = await this.prompt.string({ label: "Message" });
        result = await this.prompt.confirm({ label: text });
        break;
      case "default":
        result = await this.prompt.confirm();
        break;
      case "state":
        const state = await this.prompt.boolean({ label: "Default state" });
        result = await this.prompt.confirm({ current: state });
        break;
    }
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }

  private async date(): Promise<void> {
    this.application.setHeader("Date");
    const options = await this.prompt.objectBuilder<DateEditorEditorOptions>({
      current: {
        fuzzy: "user",
        label: "Enter date",
        type: "datetime",
      },
      elements: [
        {
          name: "Fuzzy",
          options: Object.values(TTYFuzzyTypes).map(i => ({ entry: [i] })),
          path: "fuzzy",
          type: "pick-one",
        },
        {
          name: "Label",
          path: "label",
          type: "string",
        },
        {
          name: "Date Type",
          options: Object.values(TTYDateTypes).map(i => ({ entry: [i] })),
          path: "type",
          type: "pick-one",
        },
      ],
    });
    const result = await this.prompt.date(options);
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }

  private async lists(): Promise<void> {
    this.application.setHeader("List Builder");
    const action = await this.prompt.menu({
      condensed: true,
      right: [
        { entry: ["default"] },
        { entry: ["some selected", "selected"] },
        { entry: ["custom label", "label"] },
      ],
    });
    const source = PEAT(LIST_LENGTH).map(i => {
      const element = faker.science.chemicalElement();
      return {
        entry: [element.name, `${i}`],
        helpText:
          Math.random() > HALF
            ? `${element.atomicNumber} ${element.symbol}`
            : undefined,
      } as MainMenuEntry<string>;
    });
    let result: string[];
    switch (action) {
      case "default":
        result = await this.prompt.pickMany({
          source,
        });
        break;
      case "selected":
        result = await this.prompt.pickMany({
          current: PEAT(LIST_LENGTH).map(i => {
            const element = faker.science.chemicalElement();
            return {
              entry: [element.name, `${i}`],
              helpText: `${element.atomicNumber} ${element.symbol}`,
            } as MainMenuEntry<string>;
          }),
          source,
        });
        break;
      case "label":
        const items = await this.prompt.string({ label: "Label" });
        result = await this.prompt.pickMany({ items, source });
        break;
    }
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }

  private async objectBuilder(): Promise<void> {
    this.application.setHeader("Object Builder");
    const result = await this.prompt.objectBuilder({
      current: {
        check: false,
        column1: "",
        column2: "",
        column3: "",
        extra: ["bar", "baz"],
        key: "",
        value: 5,
      },
      elements: [
        {
          helpText: "key",
          name: "Key",
          path: "key",
          type: "string",
        },
        {
          helpText: "value",
          name: "Value",
          path: "value",
          type: "number",
        },
        {
          helpText: "extra",
          hidden(i) {
            return !!i.key;
          },
          name: "Extra",
          options: [
            { entry: ["foo"] },
            { entry: ["bar"] },
            {
              entry: ["baz"],
              helpText: chalk`I am only visible when {blue key} is blank`,
            },
          ],
          path: "extra",
          type: "pick-many",
        },
        {
          helpText: "check",
          name: "Check",
          path: "check",
          type: "boolean",
        },
        {
          helpText: "column1",
          name: "Column 1",
          path: "column1",
          type: "string",
        },
        {
          helpText: "column2",
          name: "Column 2",
          path: "column2",
          type: "string",
        },
        {
          helpText: "column3",
          name: "Column 3",
          path: "column3",
          type: "string",
        },
      ],
      headerMessage: `An example of the object builder in table mode.`,
    });
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }

  private async string(): Promise<void> {
    this.application.setHeader("String");
    const result = await this.prompt.string({
      label: "Requesting some text",
      placeholder: "placeholder text",
    });
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }
}
