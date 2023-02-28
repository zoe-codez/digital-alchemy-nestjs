import {
  ARRAY_OFFSET,
  DOWN,
  EMPTY,
  INCREMENT,
  is,
  SINGLE,
  START,
  UP,
} from "@steggy/utilities";
import chalk from "chalk";
import { cwd, env, platform } from "process";

const UNSORTABLE = new RegExp("[^A-Za-z0-9]", "g");
export const ELLIPSES = "...";
const ANSIREGEX_PATTERN = [
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
  "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
].join("|");

export const ansiStrip = (text = ""): string =>
  text.replace(new RegExp(ANSIREGEX_PATTERN, "g"), "");

export function ansiPadEnd(
  text: string,
  amount: number,
  bgColor?: string,
  char = " ",
): string {
  const stripped = ansiStrip(text);
  let length = stripped.length;
  if (length > amount) {
    const update = stripped.slice(START, amount - ELLIPSES.length) + ELLIPSES;
    text = text.replace(stripped, update);
    length = update.length;
  }
  let padding = char.repeat(amount - length);
  if (bgColor) {
    padding = chalk.hex(bgColor)(padding);
  }
  return text + padding;
}

export function ansiPadStart(text: string, amount: number): string {
  const stripped = ansiStrip(text);
  const padding = stripped.padStart(amount, " ").slice(stripped.length);
  return text + padding;
}

export const ansiSort = (text: string[]): string[] =>
  text.sort((a, b) =>
    ansiStrip(a).replace(UNSORTABLE, "") > ansiStrip(b).replace(UNSORTABLE, "")
      ? UP
      : DOWN,
  );

/**
 * Return back the ansi-stripped longest element / line
 */
export const ansiMaxLength = (...items: (string[] | string)[]): number =>
  Math.max(
    ...items.flatMap(list =>
      (is.array(list) ? list : (list ?? "").split(`\n`)).map(
        line => ansiStrip(String(line)).length,
      ),
    ),
  );
const ESC = "\u001B[";
const OSC = "\u001B]";
const BEL = "\u0007";
const SEP = ";";
const isTerminalApp = env.TERM_PROGRAM === "Apple_Terminal";
const eraseScreen = `${ESC}2J`;
export const ansiEscapes = {
  beep: BEL,
  clearScreen: "\u001Bc",
  clearTerminal:
    platform === "win32"
      ? `${eraseScreen}${ESC}0f`
      : // 1. Erases the screen (Only done in case `2` is not supported)
        // 2. Erases the whole screen including scrollback buffer
        // 3. Moves cursor to the top-left position
        // More info: https://www.real-world-systems.com/docs/ANSIcode.html
        `${eraseScreen}${ESC}3J${ESC}H`,
  cursorBackward(count = SINGLE) {
    return ESC + count + "D";
  },
  cursorDown(count = SINGLE) {
    return ESC + count + "B";
  },
  cursorForward(count = SINGLE) {
    return ESC + count + "C";
  },
  cursorGetPosition: `${ESC}6n`,
  cursorHide: `${ESC}?25l`,
  cursorLeft: `${ESC}G`,
  cursorMove(x: number, y: number) {
    if (!is.number(x)) {
      throw new TypeError("The `x` argument is required");
    }
    let returnValue = "";
    if (x < START) {
      returnValue += ESC + -x + "D";
    } else if (x > START) {
      returnValue += ESC + x + "C";
    }
    if (y < START) {
      returnValue += ESC + -y + "A";
    } else if (y > START) {
      returnValue += ESC + y + "B";
    }
    return returnValue;
  },
  cursorNextLine: `${ESC}E`,
  cursorPrevLine: `${ESC}F`,
  cursorRestorePosition: isTerminalApp ? "\u001B8" : `${ESC}u`,
  cursorSavePosition: isTerminalApp ? "\u001B7" : `${ESC}s`,
  cursorShow: `${ESC}?25h`,
  cursorTo(x: number, y?: number) {
    if (!is.number(x)) {
      throw new TypeError("The `x` argument is required");
    }

    if (!is.number(y)) {
      return ESC + (x + INCREMENT) + "G";
    }

    return ESC + (y + INCREMENT) + ";" + (x + INCREMENT) + "H";
  },
  cursorUp(count = SINGLE) {
    return ESC + count + "A";
  },
  eraseDown: `${ESC}J`,
  eraseEndLine: `${ESC}K`,
  eraseLine: `${ESC}2K`,
  eraseLines(count) {
    let clear = "";
    for (let i = 0; i < count; i++) {
      clear +=
        ansiEscapes.eraseLine +
        (i < count - ARRAY_OFFSET ? ansiEscapes.cursorUp() : "");
    }
    if (count) {
      clear += ansiEscapes.cursorLeft;
    }
    return clear;
  },
  eraseScreen,
  eraseStartLine: `${ESC}1K`,
  eraseUp: `${ESC}1J`,
  iTerm: {
    annotation(
      message,
      options: {
        isHidden?: boolean;
        length?: number;
        x?: number;
        y?: number;
      } = {},
    ) {
      let returnValue = `${OSC}1337;`;
      const hasX = options.x !== undefined;
      const hasY = options.y !== undefined;
      if ((hasX || hasY) && !(hasX && hasY && options.length !== undefined)) {
        throw new Error(
          "`x`, `y` and `length` must be defined when `x` or `y` is defined",
        );
      }
      message = message.replace(/\|/g, "");
      returnValue += options.isHidden
        ? "AddHiddenAnnotation="
        : "AddAnnotation=";

      returnValue +=
        options.length > EMPTY
          ? (hasX
              ? [message, options.length, options.x, options.y]
              : [options.length, message]
            ).join("|")
          : message;

      return returnValue + BEL;
    },
    setCwd: (workingDirectory = cwd()) =>
      `${OSC}50;CurrentDir=${workingDirectory}${BEL}`,
  },

  image(
    buffer,
    options: {
      height?: number;
      preserveAspectRatio?: boolean;
      width?: number;
    } = {},
  ) {
    let returnValue = `${OSC}1337;File=inline=1`;
    if (options.width) {
      returnValue += `;width=${options.width}`;
    }
    if (options.height) {
      returnValue += `;height=${options.height}`;
    }
    if (options.preserveAspectRatio === false) {
      returnValue += ";preserveAspectRatio=0";
    }
    return returnValue + ":" + buffer.toString("base64") + BEL;
  },
  link: (text, url) =>
    [OSC, "8", SEP, SEP, url, BEL, text, OSC, "8", SEP, SEP, BEL].join(""),
  scrollDown: `${ESC}T`,
  scrollUp: `${ESC}S`,
};
