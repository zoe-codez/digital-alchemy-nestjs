/* This file is full of ported code */
/* eslint-disable @typescript-eslint/no-magic-numbers, unicorn/no-nested-ternary */
import { RGB } from "@digital-alchemy/render-utils";
import { Injectable } from "@nestjs/common";

import { PromptService } from "./prompt.service";

const OFF = 0;

@Injectable()
export class ColorsService {
  constructor(private readonly prompt: PromptService) {}

  public async buildHex(current: string): Promise<string> {
    return await this.prompt.string({
      current,
      label: `Hex Color`,
    });
  }

  public async buildRGB(current: RGB): Promise<RGB> {
    return await this.prompt.objectBuilder<RGB>({
      current: {
        b: OFF,
        g: OFF,
        r: OFF,
        ...current,
      },
      elements: [
        {
          helpText: "0-255",
          name: "Red",
          path: "r",
          type: "number",
        },
        {
          helpText: "0-255",
          name: "Green",
          path: "g",
          type: "number",
        },
        {
          helpText: "0-255",
          name: "Blue",
          path: "b",
          type: "number",
        },
      ],
    });
  }
}
