import {
  ApplicationManagerService,
  PromptService,
  ScreenService,
  TextRenderingService,
} from "@digital-alchemy/tty";
import { PEAT } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import chalk from "chalk";

@Injectable()
export class ObjectService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
  ) {}

  public async basicInteraction(): Promise<void> {
    this.application.setHeader("Object Builder");
    type ObjectResult = {
      another: number;
      check: boolean;
      column1: string;
      column2: string;
      column3: string;
      extra: string[];
      key: string;
      value: number;
    };
    const result = await this.prompt.objectBuilder<ObjectResult>({
      current: {
        another: 6,
        check: false,
        column1: "susper extra long string " + PEAT(100).join("|"),
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
        {
          options: [
            {
              entry: ["1", 5],
            },
          ],
          path: "another",
          type: "pick-one",
        },
      ],
      headerMessage: `An example of the object builder in table mode.`,
    });
    this.screen.printLine(this.text.type(result));
    await this.prompt.acknowledge();
  }
}
