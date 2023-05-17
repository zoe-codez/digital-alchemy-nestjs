import {
  ARRAY_OFFSET,
  INCREMENT,
  INVERT_VALUE,
  is,
  LABEL,
  START,
  VALUE,
} from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import chalk from "chalk";
import equal from "deep-equal";
import { get } from "object-path";

import { ansiMaxLength, ansiPadEnd, ansiStrip, ELLIPSES } from "../includes";
import {
  ObjectBuilderOptions,
  TABLE_PARTS,
  TableBuilderElement,
  TTY,
} from "../types";
import { EnvironmentService } from "./environment.service";
import { TextRenderingService } from "./text-rendering.service";

const PADDING = 1;
const DOUBLE_PADDING = 2;
const TRIPLE_PADDING = 3;
const PARTS_AND_PADDING = 7;

// const NAME_CELL = (i: TableBuilderElement, max?: number) =>
//   chalk`${" ".repeat(PADDING)}{bold.blue ${i.name.padEnd(max - PADDING, " ")}}`;

@Injectable()
export class FormService<
  VALUE extends object = Record<string, unknown>,
  CANCEL extends unknown = never,
> {
  constructor(
    private readonly text: TextRenderingService,
    private readonly environment: EnvironmentService,
  ) {}

  private activeOptions: ObjectBuilderOptions<VALUE, CANCEL>;
  private selectedRow: number;
  private value: VALUE;

  public renderForm(
    options: ObjectBuilderOptions<VALUE, CANCEL>,
    row: VALUE,
    original: VALUE,
    selectedRow: number = START,
  ): string {
    this.value = row;
    this.activeOptions = options;
    this.selectedRow = selectedRow;
    const maxLength = ansiMaxLength(
      ...this.activeOptions.elements.map(({ name }) => name),
    );
    const header = this.formBody(maxLength, original);
    return [...header].join(`\n`);
  }

  private ellipsis(value: string, maxLength: number): string {
    const stripped = ansiStrip(value);
    const length = ansiMaxLength(...stripped.split(`\n`));
    const max = maxLength - ELLIPSES.length;
    if (length > maxLength) {
      const update = stripped.slice(START, max) + ELLIPSES;
      value = value.replace(stripped, update);
    }
    return value;
  }

  private formBody(maxLabel: number, original: VALUE): string[] {
    const elements = this.activeOptions.elements;

    // ? ensure the label properly fits on the screen
    const maxValue = this.maxValueLength(maxLabel);
    const columns = elements.map((i: TableBuilderElement<VALUE>, index) =>
      this.renderValue({ i, index, maxLabel, maxValue }, original),
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

  private getRenderValue(element: TableBuilderElement<VALUE>): unknown {
    const raw = get(this.value, element.path);
    if (element.type === "pick-one") {
      const option = element.options.find(({ entry }) => entry[VALUE] === raw);
      if (option) {
        return option.entry[LABEL];
      }
    }
    if (element.type === "pick-many") {
      if (!is.array(raw)) {
        return raw;
      }
      return raw.map(item => {
        const option = element.options.find(i => is.GV(i) === item);
        if (!option) {
          return item;
        }
        return option?.entry[LABEL];
      });
    }
    return raw;
  }

  private maxValueLength(maxLabel: number) {
    return Math.min(
      this.environment.width -
        maxLabel -
        PARTS_AND_PADDING -
        // both sides padding
        DOUBLE_PADDING -
        DOUBLE_PADDING,
      DOUBLE_PADDING +
        ansiMaxLength(
          ...this.activeOptions.elements.map(i => {
            return this.text.type(this.getRenderValue(i));
          }),
        ),
    );
  }

  private nameCell(
    i: TableBuilderElement<VALUE>,
    color: "blue" | "green",
    max?: number,
  ) {
    return chalk`${" ".repeat(PADDING)}{bold.${color} ${i.name.padEnd(
      max - PADDING,
      " ",
    )}}`;
  }

  private renderValue(
    {
      i,
      index,
      maxLabel,
      maxValue,
    }: {
      i: TableBuilderElement<VALUE>;
      index: number;
      maxLabel: number;
      maxValue: number;
    },
    original: VALUE,
  ): string {
    const raw = this.getRenderValue(i);
    const v = this.text.type(raw, undefined, maxValue - INCREMENT).trim();
    const lines = v.split(`\n`).length;
    const values = (index === this.selectedRow ? chalk.inverse(v) : v).split(
      `\n`,
    );
    const labels = (
      this.nameCell(
        i,
        equal(get(original, i.path), raw) ? "blue" : "green",
        maxLabel,
      ) + `\n`.repeat(lines - INCREMENT)
    ).split(`\n`);
    return labels
      .map((labelLine, labelIndex) => {
        return [
          TABLE_PARTS.left,
          ansiPadEnd(labelLine, maxLabel + TRIPLE_PADDING),
          TABLE_PARTS.middle,
          " " +
            this.ellipsis(
              // ansiPadEnd("foobar", maxValue),
              ansiPadEnd(values[labelIndex], maxValue - INCREMENT),
              maxValue,
            ),
          TABLE_PARTS.right,
        ].join("");
      })
      .join(`\n`);
  }
}
