import { InjectConfig } from "@digital-alchemy/boilerplate";
import {
  ARRAY_OFFSET,
  DOWN,
  INCREMENT,
  is,
  LABEL,
  START,
  TitleCase,
  UP,
} from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import chalk from "chalk";
import fuzzy from "fuzzysort";
import { stdout } from "process";
import { inspect } from "util";

import { FUZZY_HIGHLIGHT, PAGE_SIZE, TEXT_DEBUG_DEPTH } from "../config";
import { MainMenuEntry, MenuEntry, MenuHelpText, TTY } from "../contracts";
import { ansiMaxLength, ansiPadEnd, template } from "../includes";

const MAX_SEARCH_SIZE = 50;
const SEPARATOR = chalk.blue.dim("|");
const BUFFER_SIZE = 3;
const MIN_SIZE = 2;
const INDENT = "  ";
const MAX_STRING_LENGTH = 300;
const FIRST = 1;
const LAST = -1;
const STRING_SHRINK = 50;
const NESTING_LEVELS = [
  chalk.cyan(" - "),
  chalk.magenta(" * "),
  chalk.green(" # "),
  chalk.yellow(" > "),
  chalk.red(" ~ "),
];

@Injectable()
export class TextRenderingService {
  constructor(
    @InjectConfig(PAGE_SIZE) private readonly pageSize: number,
    @InjectConfig(TEXT_DEBUG_DEPTH) private readonly debugDepth: number,
    @InjectConfig(FUZZY_HIGHLIGHT) private readonly highlightColor: string,
  ) {
    const [OPEN, CLOSE] = template(`{${highlightColor} _}`).split("_");
    this.open = OPEN;
    this.close = CLOSE;
  }

  private close: string;
  private open: string;

  /**
   * Helper method for component rendering
   *
   * Render:
   *  - 2 vertical lists horizontally next to each other
   *  - Place a dim blue line between them
   *  - Prepend a search box (if appropriate)
   *
   *
   * ## Note
   *
   * Right size is considered "primary" / "preferred".
   * Left side is considered the "secondary" column
   */
  public assemble(
    leftEntries: string[],
    rightEntries: string[],
    {
      left,
      right,
      search,
    }: { left?: string; right?: string; search?: string } = {},
  ): string[] {
    const out = [...leftEntries];
    left = left ? " " + left : left;
    const maxA = ansiMaxLength(...leftEntries, left) + ARRAY_OFFSET;
    const maxB = ansiMaxLength(...rightEntries, right);
    rightEntries.forEach((item, index) => {
      const current = ansiPadEnd(out[index] ?? "", maxA);
      item = ansiPadEnd(item, maxB);
      out[index] = chalk`${current}${SEPARATOR}${item}`;
    });
    if (leftEntries.length > rightEntries.length) {
      out.forEach(
        (line, index) =>
          (out[index] =
            index < rightEntries.length
              ? line
              : ansiPadEnd(line, maxA) + SEPARATOR),
      );
    }
    if (!is.empty(left)) {
      out.unshift(
        chalk`{blue.bold ${left.padStart(
          maxA - ARRAY_OFFSET,
          " ",
        )}} {blue.dim |}{blue.bold ${right.padEnd(maxB, " ")}}`,
      );
    }
    if (is.string(search)) {
      out.unshift(...this.searchBox(search));
    }
    return out;
  }

  public debug(data: object): string {
    const [width] = stdout.getWindowSize();
    return (
      inspect(data, {
        colors: true,
        compact: false,
        depth: this.debugDepth,
        maxStringLength: Math.min(width - STRING_SHRINK, STRING_SHRINK),
        sorted: true,
      })
        .split("\n")
        // strip off outer curly braces
        .slice(FIRST, LAST)
        // un-indent single level
        .map(i => (i.startsWith(INDENT) ? i.slice(INDENT.length) : i))
        .join("\n")
    );
  }

  /**
   * Fuzzy sorting for menu entries.
   * More greedy than the basic `fuzzySort`
   *
   * Takes into account helpText and category in addition to label
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  public fuzzyMenuSort<T extends unknown = string>(
    searchText: string,
    data: MainMenuEntry<T>[],
  ): MainMenuEntry<T>[] {
    if (is.empty(searchText)) {
      return data;
    }
    const formatted = data.map(i => ({
      help: i.helpText,
      label: i.entry[LABEL],
      type: i.type,
      value: i,
    }));

    /* eslint-disable @typescript-eslint/no-magic-numbers */
    const results = fuzzy.go(searchText, formatted, {
      keys: ["label", "help", "type"],
      scoreFn(item) {
        return Math.max(
          // ? indexes match keys
          // Matching type is important
          // Next is label
          // Finally help
          item[2] ? item[2].score - 0 : -1000,
          item[0] ? item[0].score - 250 : -1000,
          item[1] ? item[1].score - 500 : -1000,
        );
      },
      threshold: -10_000,
    });

    return results
      .filter(([label, help, type]) => {
        // Bad results: those without anything to highlight
        // These will have a score of -1000
        // Not all -1000 score items have nothing to highlight though
        return !(label === null && help === null && type === null);
      })
      .map(result => {
        const label = fuzzy.highlight(
          is.object(result[0]) ? result[0] : fuzzy.single(result.obj.label, ""),
          this.open,
          this.close,
        );
        const help = fuzzy.highlight(
          is.object(result[1])
            ? result[1]
            : fuzzy.single(this.helpFormat(result.obj.help), ""),
          this.open,
          this.close,
        );
        const type = fuzzy.highlight(
          is.object(result[2]) ? result[2] : fuzzy.single(result.obj.type, ""),
          this.open,
          this.close,
        );
        const out = {
          entry: [
            label || result.obj.value.entry[LABEL],
            TTY.GV(result.obj.value),
          ] as MenuEntry<T>,
          helpText: help || result.obj.value.helpText,
          type: type || result.obj.value.type,
        };
        return out;
      });
  }

  /**
   * Take a listing of menu entries, and use fuzzy sort to filter & order results
   */
  public fuzzySort<T extends unknown = string>(
    searchText: string,
    data: MainMenuEntry<T>[],
  ): MainMenuEntry<T>[] {
    if (is.empty(searchText)) {
      return data;
    }
    const formatted = data.map(i => ({
      help: i.helpText,
      label: i.entry[LABEL],
      type: i.type,
      value: TTY.GV(i.entry),
    }));
    return fuzzy
      .go(searchText, formatted, { all: true, key: "label" })
      .map(result => {
        return {
          entry: [
            fuzzy.highlight(result, this.open, this.close),
            result.obj.value,
          ],
          helpText: result.obj.help,
          type: result.obj.type,
        } as MainMenuEntry<T>;
      });
  }

  public mergeHelp(
    message: string,
    { helpText = "" }: { helpText?: MenuHelpText } = {},
  ) {
    if (is.empty(helpText)) {
      return message;
    }
    return message + chalk`\n \n {blue.dim ?} ${this.helpFormat(helpText)}`;
  }

  /**
   * Take a multiline string, and add an appropriate number of spaces to the beginning of each line
   */
  public pad(message: string, amount = MIN_SIZE): string {
    return message
      .split(`\n`)
      .map(i => `${" ".repeat(amount)}${i}`)
      .join(`\n`);
  }

  /**
   * Component rendering
   */
  public searchBox(searchText: string, size = MAX_SEARCH_SIZE): string[] {
    const text = is.empty(searchText)
      ? chalk.bgBlue`Type to filter`
      : searchText;
    return [
      chalk` `,
      " " +
        chalk[is.empty(searchText) ? "bgBlue" : "bgWhite"].black` ${ansiPadEnd(
          text,
          size,
        )} `,
      ` `,
    ];
  }

  /**
   * Take return a an array slice based on the position of a given value, and PAGE_SIZE.
   */
  public selectRange<T>(
    entries: MainMenuEntry<T>[],
    value: unknown,
  ): MainMenuEntry<T>[] {
    if (entries.length <= this.pageSize) {
      return entries;
    }
    const index = entries.findIndex(i => TTY.GV(i) === value);
    if (index <= BUFFER_SIZE) {
      return entries.slice(START, this.pageSize);
    }
    if (index >= entries.length - this.pageSize + BUFFER_SIZE) {
      return entries.slice(entries.length - this.pageSize);
    }
    return entries.slice(
      index - BUFFER_SIZE,
      this.pageSize + index - BUFFER_SIZE,
    );
  }

  /**
   * Take in a variable of unknown type, return formatted pretty text to print to console
   *
   * Recursively handles objects and arrays.
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  public type(item: unknown, nested = START): string {
    if (is.undefined(item)) {
      return chalk.gray(`undefined`);
    }
    if (is.date(item)) {
      return chalk.green(item.toLocaleString());
    }
    if (is.number(item)) {
      return chalk.yellow(Number(item).toLocaleString());
    }
    if (is.boolean(item)) {
      return chalk.magenta(String(item));
    }
    if (is.string(item)) {
      if (is.empty(item)) {
        return chalk.gray(`empty string`);
      }
      return chalk.blue(
        item.slice(START, MAX_STRING_LENGTH) +
          (item.length > MAX_STRING_LENGTH ? chalk.blueBright`...` : ``),
      );
    }
    if (is.array(item)) {
      if (is.empty(item)) {
        return chalk.gray(`empty array`);
      }
      return (
        `\n` +
        item
          .map(
            i =>
              INDENT.repeat(nested) +
              NESTING_LEVELS[nested] +
              this.type(i, nested + INCREMENT),
          )
          .join(`\n`)
      );
    }
    if (item === null) {
      return chalk.gray(`null`);
    }
    if (is.object(item)) {
      const maxKey =
        Math.max(...Object.keys(item).map(i => TitleCase(i).length)) +
        INCREMENT;
      return (
        (nested ? `\n` : "") +
        Object.keys(item)
          .sort((a, b) => (a > b ? UP : DOWN))
          .map(
            key =>
              chalk`${INDENT.repeat(nested)}{bold ${
                NESTING_LEVELS[nested]
              }${TitleCase(key).padEnd(maxKey)}} ${this.type(
                item[key],
                nested + INCREMENT,
              )}`,
          )
          .join(`\n`)
      );
    }
    return chalk.gray(JSON.stringify(item));
  }

  private helpFormat(helpText: MenuHelpText): string {
    if (is.array(helpText)) {
      helpText = helpText.join(`\n`);
    }
    if (is.object(helpText)) {
      helpText = this.debug(helpText);
    }
    return helpText;
  }
}
