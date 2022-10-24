import { Injectable } from "@nestjs/common";
import {
  ARRAY_OFFSET,
  INCREMENT,
  LABEL,
  START,
  VALUE,
} from "@steggy/utilities";
import chalk from "chalk";
import { get } from "object-path";

import {
  GV,
  TABLE_PARTS,
  TableBuilderElement,
  TableBuilderOptions,
} from "../../contracts";
import { ansiMaxLength, ansiPadEnd } from "../../includes";
import { TextRenderingService } from "./text-rendering.service";

const PADDING = 1;
const DOUBLE_PADDING = 2;
const TRIPLE_PADDING = 3;

const NAME_CELL = (i: TableBuilderElement, max?: number) =>
  chalk`${" ".repeat(PADDING)}{bold.blue ${i.name.padEnd(max - PADDING, " ")}}`;

@Injectable()
export class FormService<VALUE extends object = Record<string, unknown>> {
  constructor(private readonly textRender: TextRenderingService) {}

  private activeOptions: TableBuilderOptions<VALUE>;
  private selectedRow: number;
  private value: VALUE;

  public renderForm(
    options: TableBuilderOptions<VALUE>,
    row: VALUE,
    selectedRow: number = START,
  ): string {
    this.value = row;
    this.activeOptions = options;
    this.selectedRow = selectedRow;
    const maxLength = ansiMaxLength(
      ...this.activeOptions.elements.map(({ name }) => name),
    );
    const header = this.formBody(maxLength);
    return [...header].join(`\n`);
  }

  private formBody(maxLabel: number): string[] {
    const elements = this.activeOptions.elements;
    const maxValue =
      DOUBLE_PADDING +
      ansiMaxLength(
        ...elements.map(i => {
          return this.textRender.type(this.getRenderValue(i));
        }),
      );
    const columns = elements.map((i: TableBuilderElement, index) =>
      this.renderValue({ i, index, maxLabel, maxValue }),
    );
    const header = [
      TABLE_PARTS.top_left,
      TABLE_PARTS.top.repeat(maxLabel + TRIPLE_PADDING),
      TABLE_PARTS.top_mid,
      TABLE_PARTS.top.repeat(maxValue),
      TABLE_PARTS.top_right,
    ].join(``);
    const footer = [
      TABLE_PARTS.bottom_left,
      TABLE_PARTS.top.repeat(maxLabel + TRIPLE_PADDING),
      TABLE_PARTS.bottom_mid,
      TABLE_PARTS.top.repeat(maxValue),
      TABLE_PARTS.bottom_right,
    ].join("");
    return [
      header,
      ...columns.flatMap((i, index, array) =>
        index === array.length - ARRAY_OFFSET
          ? [i]
          : [
              i,
              [
                TABLE_PARTS.left_mid,
                TABLE_PARTS.mid.repeat(maxLabel + TRIPLE_PADDING),
                TABLE_PARTS.mid_mid,
                TABLE_PARTS.mid.repeat(maxValue),
                TABLE_PARTS.right_mid,
              ].join(``),
            ],
      ),
      footer,
    ];
  }

  private getRenderValue(element: TableBuilderElement<VALUE>): string {
    const raw = get(this.value, element.path);
    if (element.type === "enum") {
      const option = element.options.find(({ entry }) => entry[VALUE] === raw);
      if (option) {
        return option.entry[LABEL];
      }
    }
    if (element.type === "enum-array") {
      if (!Array.isArray(raw)) {
        return raw;
      }
      return raw
        .map(item => {
          const option = element.options.find(i => GV(i) === item);
          if (!option) {
            return item;
          }
          return option?.entry[LABEL];
        })
        .join(`\n`);
    }
    return raw;
  }

  private renderValue({
    i,
    index,
    maxLabel,
    maxValue,
  }: {
    i: TableBuilderElement;
    index: number;
    maxLabel: number;
    maxValue: number;
  }): string {
    const raw = this.getRenderValue(i);
    const v = this.textRender.type(raw).trim();
    const lines = v.split(`\n`).length;
    const values = (index === this.selectedRow ? chalk.inverse(v) : v).split(
      `\n`,
    );
    const labels = (
      NAME_CELL(i, maxLabel) + `\n`.repeat(lines - INCREMENT)
    ).split(`\n`);
    return labels
      .map((labelLine, labelIndex) => {
        return [
          TABLE_PARTS.left,
          ansiPadEnd(labelLine, maxLabel + TRIPLE_PADDING),
          TABLE_PARTS.middle,
          ansiPadEnd(" " + values[labelIndex], maxValue),
          TABLE_PARTS.right,
        ].join("");
      })
      .join(`\n`);
  }
}
