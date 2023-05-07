import { InjectConfig } from "@digital-alchemy/boilerplate";
import {
  ARRAY_OFFSET,
  DOWN,
  EMPTY,
  INCREMENT,
  is,
  LABEL,
  NONE,
  NOT_FOUND,
  ONE_THIRD,
  SINGLE,
  START,
  TitleCase,
  UP,
} from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import chalk from "chalk";
import fuzzy from "fuzzysort";
import { get } from "object-path";
import { stdout } from "process";
import { inspect, InspectOptions } from "util";

import {
  FUZZY_HIGHLIGHT,
  MENU_COLUMN_DIVIDER,
  PAGE_SIZE,
  TEXT_DEBUG_ARRAY_LENGTH,
  TEXT_DEBUG_DEPTH,
} from "../config";
import { ansiMaxLength, ansiPadEnd, ELLIPSES, template } from "../includes";
import {
  BaseSearchOptions,
  EditableSearchBoxOptions,
  MainMenuEntry,
  MenuDeepSearch,
  MenuHelpText,
  MenuSearchOptions,
  TTY,
} from "../types";

const MAX_SEARCH_SIZE = 50;
const BUFFER_SIZE = 3;
const MIN_SIZE = 2;
const INDENT = "  ";
const MAX_STRING_LENGTH = 300;
const FIRST = 1;
const BAD_MATCH = -10_000;
const BAD_VALUE = -1000;
const LAST = -1;
const STRING_SHRINK = 100;
// const TEXT_DEBUG = chalk`\n{green.bold ${"=-".repeat(30)}}\n`;
const TEXT_DEBUG = "";
const NESTING_LEVELS = [
  chalk.cyan(" - "),
  chalk.magenta(" * "),
  chalk.green(" # "),
  chalk.yellow(" > "),
  chalk.red(" ~ "),
];

// ? indexes match keys
// Matching type is important
// Next is label
// Finally help
const MATCH_SCORES = {
  deep: 350,
  helpText: 500,
  label: 250,
  type: 0,
};
type MatchKeys = keyof typeof MATCH_SCORES;

const DEFAULT_PLACEHOLDER = "enter value";

type HighlightResult<T> = Fuzzysort.KeysResult<{
  deep: object;
  helpText: MenuHelpText;
  label: string;
  type: string;
  value: MainMenuEntry<T>;
}>;
const TEXT_CAP = " ";

@Injectable()
export class TextRenderingService {
  constructor(
    @InjectConfig(PAGE_SIZE) private readonly pageSize: number,
    @InjectConfig(TEXT_DEBUG_DEPTH) private readonly debugDepth: number,
    @InjectConfig(TEXT_DEBUG_ARRAY_LENGTH)
    private readonly maxArrayLength: number,
    @InjectConfig(FUZZY_HIGHLIGHT) private readonly highlightColor: string,
    @InjectConfig(MENU_COLUMN_DIVIDER) private readonly menuDivider: string,
  ) {
    const [OPEN, CLOSE] = template(`{${this.highlightColor} _}`).split("_");
    this.open = OPEN;
    this.menuDivider = template(this.menuDivider);
    this.close = CLOSE;
  }

  private close: string;
  private open: string;

  /**
   * # Helper method for component rendering
   *
   * ## Render
   *
   * ~ 2 vertical lists horizontally next to each other
   * ~ Place a dim blue line between them
   * ~ Prepend a search box (if appropriate)
   */
  public assemble(
    [leftEntries, rightEntries]: [string[], string[]],
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
      out[index] = chalk`${current}${this.menuDivider}${item}`;
    });
    if (leftEntries.length > rightEntries.length) {
      out.forEach(
        (line, index) =>
          (out[index] =
            index < rightEntries.length
              ? line
              : ansiPadEnd(line, maxA) + this.menuDivider),
      );
    }
    if (!is.empty(left)) {
      left = left.padStart(maxA - ARRAY_OFFSET, " ");
      right = right.padEnd(maxB, " ");
      out.unshift(
        chalk`{blue.bold ${left}} ${chalk(
          this.menuDivider,
        )}{blue.bold ${right}}`,
      );
    }
    if (is.string(search)) {
      out.unshift(...this.searchBox(search));
    }
    return out;
  }

  public debug(data: object, options: InspectOptions = {}): string {
    const [width] = stdout.getWindowSize();
    return (
      inspect(data, {
        colors: true,
        compact: false,
        depth: this.debugDepth,
        maxArrayLength: this.maxArrayLength,
        maxStringLength: Math.min(width, STRING_SHRINK),
        sorted: true,
        ...options,
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
  public fuzzyMenuSort<T extends unknown = string>(
    searchText: string,
    data: MainMenuEntry<T>[],
    options?: MenuSearchOptions<T>,
  ): MainMenuEntry<T>[] {
    const searchEnabled = is.object(options)
      ? (options as BaseSearchOptions).enabled !== false
      : // false is the only allowed boolean
        // undefined = default enabled
        !is.boolean(options);
    if (!searchEnabled || is.empty(searchText)) {
      return data;
    }
    const objectOptions = (options ?? {}) as MenuSearchOptions<object>;
    const deep = (objectOptions as MenuDeepSearch).deep;

    const formatted = data.map(i => {
      const value = TTY.GV(i.entry);
      return {
        deep: is.object(value) && !is.empty(deep) ? get(value, deep) : {},
        helpText: i.helpText,
        label: i.entry[LABEL],
        type: i.type,
        value: i,
      };
    });

    const flags = (is.object(options) ? options : {}) as BaseSearchOptions;
    flags.helpText ??= true;
    flags.label ??= true;
    flags.type ??= true;

    const keys = Object.keys(flags).filter(i => flags[i]) as MatchKeys[];
    if (!is.empty(deep)) {
      keys.push("deep");
    }

    const results = fuzzy.go(searchText, formatted, {
      keys,
      scoreFn: item =>
        Math.max(
          ...keys.map((key, index) =>
            item[index] ? item[index].score - MATCH_SCORES[key] : BAD_VALUE,
          ),
        ),
      threshold: BAD_MATCH,
    });

    // Bad results: those without anything to highlight
    // These will have a score of -1000
    // Not all -1000 score items have nothing to highlight though
    return results
      .filter(data => !data.every(i => i === null))
      .map(result => ({
        entry: [
          this.fuzzyHighlight(keys, result, "label"),
          TTY.GV(result.obj.value),
        ],
        helpText: this.fuzzyHighlight(keys, result, "helpText"),
        type: this.fuzzyHighlight(keys, result, "type"),
      }));
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

  public helpFormat(helpText: MenuHelpText): string {
    if (is.array(helpText)) {
      helpText = helpText.join(`\n`);
    }
    if (is.object(helpText)) {
      helpText = chalk`{cyan.bold Reference Data}\n` + this.debug(helpText);
    }
    return helpText;
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

  public searchBoxEditable({
    value,
    width,
    bgColor,
    padding = SINGLE,
    cursor: index,
    placeholder = DEFAULT_PLACEHOLDER,
  }: EditableSearchBoxOptions): string[] {
    // * If no value, return back empty box w/ placeholder
    if (!value) {
      return [chalk[bgColor].black(ansiPadEnd(` ${placeholder} `, width))];
    }
    const out: string[] = [];

    const { text, cursor, debug } = this.sliceRange({
      index: index,
      maxLength: width,
      text: value,
    });
    value = [...text]
      .map((i, index) =>
        index === cursor
          ? chalk[bgColor].black.inverse(i)
          : chalk[bgColor].black(i),
      )
      .join("");

    const pad = chalk[bgColor](" ".repeat(padding));
    out.push(ansiPadEnd([pad, value, pad].join(""), width));

    if (!is.empty(TEXT_DEBUG)) {
      out.push(TEXT_DEBUG, this.debug(debug), TEXT_DEBUG);
    }
    return out;
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
  public type(
    item: unknown,
    nested = START,
    maxLength = MAX_STRING_LENGTH,
  ): string {
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
      let trimmed: string = item;
      if (
        is.number(maxLength) &&
        maxLength > EMPTY &&
        item.length > maxLength
      ) {
        trimmed = (trimmed.slice(START, maxLength - ELLIPSES.length) +
          chalk.blueBright(ELLIPSES)) as string;
      }
      return chalk.blue(trimmed);
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

      const indent = INDENT.repeat(nested);
      const nesting = NESTING_LEVELS[nested];
      const title = key => TitleCase(key).padEnd(maxKey);
      const type = key => this.type(item[key], nested + INCREMENT);

      return (
        (nested ? `\n` : "") +
        Object.keys(item)
          .sort((a, b) => (a > b ? UP : DOWN))
          .map(
            key => chalk`${indent}{bold ${nesting}${title(key)}} ${type(key)}`,
          )
          .join(`\n`)
      );
    }
    return chalk.gray(JSON.stringify(item));
  }

  private fuzzyHighlight<T>(
    keys: MatchKeys[],
    result: HighlightResult<T>,
    type: MatchKeys,
  ): string {
    const index = keys.indexOf(type);
    const defaultValue = result.obj[type] as string;
    if (index === NOT_FOUND) {
      return defaultValue;
    }
    const label = fuzzy.highlight(
      is.object(result[index])
        ? result[index]
        : fuzzy.single(defaultValue as string, ""),
      this.open,
      this.close,
    );
    return label || defaultValue;
  }

  /**
   * # Rules
   *
   * Render the box in such a way that newly inserted characters will insert left of the cursor
   * In moving around long strings, the cursor should attempt to stay fixed at the 1/3 point (left side)
   *
   * ## Short strings
   *
   * > lte max length
   *
   * These haven't hit the max size, do not modify.
   * Pad as needed to reach max length
   *
   * ## Long strings
   *
   * > Longer strings that can have the cursor freely moving without being near a text boundary
   *
   * An extra space is appended to the text in order to have a place for the cursor to render at when at the "end".
   * This number is accounted for in the difference between the string length & character indexes
   *
   * ### Cursor at text end
   *
   * ~ render cursor in added blank space (if at end)
   * ~ slice off excess text
   * ~ prefix/append ellipsis
   *
   * ### No nearby text boundary
   *
   * ~ fix the cursor at left 1/3 line
   * ~ prefix & append ellipsis
   * ~ slice text to match max length
   *
   * ### Near boundary
   *
   * Maximum amount of text should be visible
   *
   * ~ (at end) Final 2 characters reveal together: one is the inserted blank space
   * ~ Ellipsis incremenentally revleals
   * ~ When all characters are visible, cursor starts moving towards text boundary
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private sliceRange({
    text,
    index,
    maxLength,
  }: SliceRangeOptions): SliceTextResult {
    text += TEXT_CAP;
    const total = text.length;
    const difference = total - maxLength;
    const dotLength = ELLIPSES.length;
    // * Short strings
    if (total <= maxLength) {
      text = text.padEnd(maxLength, " ");
      return {
        cursor: index,
        debug: {
          index,
          maxLength,
          reason: "short string",
          total,
        },
        text,
      };
    }

    const insetLeft = Math.max(Math.floor(maxLength * ONE_THIRD), dotLength);
    const offset = Math.max(index - insetLeft + ARRAY_OFFSET);
    const sliding = total - maxLength + insetLeft - dotLength;
    const modifiedLength = dotLength - TEXT_CAP.length;

    // ? Desired start pattern: 0, 2, 4, 5, 6, 7, 8, 9....
    //  Left side text will appear to jump a bit as ellipses grows
    /* eslint-disable @typescript-eslint/no-magic-numbers */
    const start = offset === 1 ? 2 : offset + 2;

    const pre = ".".repeat(offset === 1 ? 2 : 3);

    // * At end
    if (index === total) {
      text = ELLIPSES + text.slice(total - maxLength + ARRAY_OFFSET) + TEXT_CAP;
      return {
        cursor: maxLength + dotLength - ARRAY_OFFSET,
        debug: {
          index,
          maxLength,
          reason: "at end",
          start: total - maxLength + ARRAY_OFFSET,
          total,
        },
        text,
      };
    }

    // * At start
    // * Near start
    if (index < insetLeft) {
      text = text.slice(START, maxLength) + ELLIPSES;
      return {
        cursor: index,
        debug: {
          index,
          insetLeft,
          maxLength,
          reason: "at / near start",
          total,
        },
        text,
      };
    }

    // * Approaching end
    if (index >= sliding - modifiedLength) {
      const repeat = sliding - index + ARRAY_OFFSET;
      const suffix = repeat > NONE ? ".".repeat(repeat) : "";
      const sLength = suffix.trim().length;
      text = ELLIPSES + text.slice(total - maxLength, total - sLength) + suffix;
      return {
        cursor: index - difference + modifiedLength,
        debug: {
          index,
          maxLength,
          reason: "approaching end",
          total,
        },
        text,
      };
    }
    /* eslint-enable @typescript-eslint/no-magic-numbers */
    // * Middle area
    text = pre + text.slice(start, start + maxLength - pre.length) + ELLIPSES;
    return {
      cursor: insetLeft,
      debug: {
        index,
        maxLength,
        reason: "sliding middle",
        total,
      },
      text,
    };
  }
}
type SliceRangeOptions = {
  index: number;
  maxLength: number;
  text: string;
};
type SliceTextResult = {
  cursor: number;
  debug: object;
  text: string;
};
