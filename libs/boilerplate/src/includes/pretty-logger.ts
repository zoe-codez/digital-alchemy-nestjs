/* eslint-disable @typescript-eslint/no-magic-numbers, radar/no-duplicate-string */
// import is required for proper dependency generation in package.json for builds
import "pino-pretty";

import { is } from "@steggy/utilities";
import chalk from "chalk";
import pino from "pino";
import PinoPretty from "pino-pretty";
import { cwd } from "process";

// KEEP IMPORT AS DIRECT FROM FILE
import { AutoLogService, LoggerFunction } from "../services/auto-log.service";

/**
 * # Description
 *
 * This file describes the crazy unreadable logic that goes into making the pretty logger look pretty.
 * The basic expected format of a log message is this:
 *
 * [TIMESTAMP]:[LIBRARY:PROVIDER] MESSAGE {...DATA AS JSON}
 *
 * ## Timestamps
 *
 * - timestamp is white, not bold
 * - timestamp formatted like "Sat 10:49:00.001"
 *
 * ## Context
 *
 * The context must be part of the data payload from the log wrapper, this file cannot automatically determine it.
 * The context is bold, and the color is used to indicate the log level.
 *
 *   trace => grey
 *   debug => blue.dim
 *   warn => yellow.dim
 *   error => red
 *   info => green
 *   fatal => magenta
 *
 * ## Message
 *
 * Message color is cyan by default.
 * There are some provided formatters that can be used to modify text appearance and color.
 *
 * - magenta.bold: "[TEXT]"
 *
 * Typically used for noun references. Ex: "[Human Readable Name] did a thing!"
 */

let logger: ReturnType<typeof pino>;

export type CONTEXT_COLORS =
  | "bgBlue.dim"
  | "bgYellow.dim"
  | "bgGreen"
  | "bgRed"
  | "bgMagenta"
  | "bgGrey";

export const highlightContext = (
  context: string,
  level: CONTEXT_COLORS,
): string => chalk`{bold.${level.slice(2).toLowerCase()} [${context}]}`;

const NEST = "@nestjs";
const frontDash = " - ";
const MAX_CUTOFF = 2000;
const YELLOW_DASH = chalk.yellowBright(frontDash);

export const METHOD_COLORS = new Map<pino.Level, CONTEXT_COLORS>([
  ["trace", "bgGrey"],
  ["debug", "bgBlue.dim"],
  ["warn", "bgYellow.dim"],
  ["error", "bgRed"],
  ["info", "bgGreen"],
  ["fatal", "bgMagenta"],
]);
export const prettyFormatMessage = (message: string): string => {
  if (!message) {
    return ``;
  }
  if (message.length > MAX_CUTOFF) {
    return message;
  }
  message = message
    // ? partA#partB - highlight it all in yellow
    .replace(new RegExp("([^ ]+#[^ ]+)", "g"), i => chalk.yellow(i))
    // ? [A] > [B] > [C] - highlight the >'s in blue
    .replaceAll("] > [", chalk`] {blue >} [`)
    // ? [Text] - strip brackets, highlight magenta
    .replace(new RegExp("(\\[[^\\]\\[]+\\])", "g"), i =>
      chalk.bold.magenta(i.slice(1, -1)),
    )
    // ? {Text} - strip braces, highlight gray
    .replace(new RegExp("(\\{[^\\]}]+\\})", "g"), i =>
      chalk.bold.gray(i.slice(1, -1)),
    );
  // ? " - Text" (line prefix with dash) - highlight dash
  if (message.slice(0, frontDash.length) === frontDash) {
    message = `${YELLOW_DASH}${message.slice(frontDash.length)}`;
  }
  return message;
};

/**
 * Re-written error message, with syntax highlighting! Don't judge my boredom
 */
const prettyErrorMessage = (message: string): string => {
  if (!message) {
    return ``;
  }
  const lines = message.split(`\n`);
  const prefix = "dependencies of the ";
  if (lines[0].includes(prefix)) {
    // eslint-disable-next-line prefer-const
    let [service, module] = lines[0].split(".");
    service = service.slice(service.indexOf(prefix) + prefix.length);
    const PROVIDER = service.slice(0, service.indexOf(" "));
    service = service.slice(service.indexOf(" ") + 1);
    const ctorArguments = service
      .slice(1, -1)
      .split(",")
      .map(item => item.trim());
    const match = module.match(new RegExp("in the ([^ ]+) context"));
    const [, name] = module.match(new RegExp("the argument ([^ ]+) at"));

    const coloredName = chalk.red.bold(name);
    const importWord = chalk.yellow("import");
    const fromWord = chalk.yellow(`from`);
    const left = chalk.blueBright(`{`);
    const right = chalk.blueBright(`}`);
    let found = false;
    const stack = message.split(`\n\n`)[2];

    const coloredArguments = ctorArguments.map(parameter => {
      if (found === false) {
        if (parameter === "?") {
          found = true;
          return coloredName;
        }
        return chalk.greenBright.bold(parameter);
      }
      return chalk.bold.yellow(parameter);
    });

    message = [
      ``,
      chalk.white
        .bold`Nest cannot resolve the dependencies of {bold.underline.magenta ${match[1]}}:{cyanBright.underline ${PROVIDER}}`,
      ``,
      chalk.magenta`@Injectable()`,
      `${chalk.yellow("export class")} ${PROVIDER} ${left}`,
      chalk.gray`  ...`,
      `  ${chalk.yellow("constructor")} ${chalk.blueBright(`(`)}`,
      ...coloredArguments.map(line => `    ${line},`),
      chalk.blueBright(` ) {}`),
      chalk.gray` ...`,
      right,
      ``,
      chalk.white.bold`Potential solutions:`,
      chalk.whiteBright` - If ${coloredName} is a provider, is it part of the current {bold.magenta ${match[1]}}?`,
      chalk.whiteBright` - If ${coloredName} is exported from a separate {bold.magenta @Module}, is that module imported within {bold.magenta ${match[1]}}?`,
      `${chalk.magenta("@Module")} ${chalk.blueBright("({")} `,
      `  ${chalk.white("imports")}: [ `,
      chalk.gray`    /* the {magenta.bold Module} containing ${coloredName} */`,
      `  ] `,
      chalk.blueBright(`})`),
      chalk.whiteBright` - Circular references`,
      chalk.gray` ...`,
      `  ${chalk.yellow("constructor")} ${chalk.blueBright(`(`)}`,
      ...coloredArguments
        .map(item => {
          if (item === coloredName) {
            return `${chalk.magenta(`@Inject`)}${chalk.blueBright(
              "(",
            )}${chalk.yellow("forwardRef")}${chalk.blueBright(
              "(()",
            )} => ${coloredName}${chalk.blueBright("))")} ${item}`;
          }
          return item;
        })
        .map(line => `    ${line},`),
      chalk.blueBright(` ) {}`),
      chalk.gray` ...`,
      chalk.whiteBright` - Verify import statement follows these standards`,
      chalk.gray`// Good imports 👍`,
      ...['"@another/library"', '"./file"', '"../directory"'].map(
        statement =>
          `${importWord} ${left} ${coloredName} ${right} ${fromWord} ${chalk.green(
            statement,
          )};`,
      ),
      chalk.gray`// Breaking imports 👎`,
      ...['"."', '".."', '"../.."'].map(
        statement =>
          `${importWord} ${left} ${coloredName} ${right} ${fromWord} ${chalk.red(
            statement,
          )};`,
      ),
      chalk.gray`// Oops import 🤔`,
      `${chalk.yellow(
        `import type`,
      )} ${left} ${coloredName} ${right} ${chalk.yellow(`from`)} ....`,
      ``,
      ``,
      chalk.white.bold`Stack Trace`,
      stack.replaceAll(cwd(), chalk.underline`workspace`),
    ].join(`\n`);
  }

  return message;
};

export const PrettyNestLogger: Record<
  "log" | "warn" | "error" | "debug" | "verbose",
  (a: string, b: string) => void
> = {
  debug: (message, context: string) => {
    context = `${NEST}:${context}`;
    if (context === `${NEST}:InstanceLoader`) {
      message = prettyFormatMessage(
        message
          .split(" ")
          .map((item, index) => (index === 0 ? `[${item}]` : item))
          .join(" "),
      );
    }
    // Never actually seen this come through
    // Using magenta to make it obvious if it happens, but will change to blue later
    logger.debug(`${highlightContext(context, "bgMagenta")} ${message}`);
  },
  error: (message: string, context: string) => {
    context = `${NEST}:${context}`;
    if (context.length > 20) {
      // Context contains the stack trace of the nest injector
      // Nothing actually useful for debugging
      message = prettyErrorMessage(context);
      // 🚩 I hereby stake my claim on this error message 🚩
      context = `@steggy:BootErrorMessage`;
    }
    logger.error(
      `${highlightContext(context, "bgRed")} ${
        message ?? "ERROR MESSAGE NOT PROVIDED"
      }`,
    );
  },
  log: (message, context) => {
    let method = "debug";
    let bgColor = "bgGreen";
    context = `${NEST}:${context}`;
    if (context === `${NEST}:InstanceLoader`) {
      message = prettyFormatMessage(
        message
          .split(" ")
          .map((item, index) => (index === 0 ? `[${item}]` : item))
          .join(" "),
      );
    }
    if (context === `${NEST}:RoutesResolver`) {
      const parts = message.split(" ");
      message = prettyFormatMessage(
        [`[${parts[0]}]`, parts[1]].join(" ").slice(0, -1),
      );
    }
    if (context === `${NEST}:NestApplication` && message.includes("started")) {
      // Don't judge me for rewriting messages to add emoji
      message = `🐣 ${message} 🐣`;
    }
    if (context === `${NEST}:RouterExplorer`) {
      const [parts] = message.match(new RegExp("(\\{[^\\]]+\\})"));
      const [path, routeMethod] = parts.slice(1, -1).split(", ");
      message = prettyFormatMessage(` - [${routeMethod}] {${path}}`);
      method = "debug";
      bgColor = "bgBlue.dim";
      // if (matches) {
      //   message = message.replace(
      //     matches[0],
      //     chalk`{bold.gray ${matches[0].slice(1, -1)}}`,
      //   );
      // }
      // const parts = message.split(' ');
      // message = prettyFormatMessage(
      //   [`[${parts[0]}]`, parts[1]].join(' ').slice(0, -1),
      // );
    }
    logger[method](
      `${highlightContext(context, bgColor as CONTEXT_COLORS)} ${message}`,
    );
  },

  verbose: (message, context) => {
    PrettyNestLogger.debug(message, context);
  },
  warn: (message, context) => {
    logger.warn(
      `${highlightContext(`${NEST}:${context}`, "bgYellow.dim")} ${message}`,
    );
  },
};

export type PrettyLoggerConfig =
  | {
      /**
       * Reference to an already configured pino logger instance. AutoLog will use this for output
       *
       * @see https://github.com/pinojs/pino
       */
      logger: ReturnType<typeof pino>;
    }
  | {
      /**
       * Use the built in pino instance, but provide custom configuration options for `pino-pretty`
       *
       * @see https://github.com/pinojs/pino-pretty
       */
      prettyOptions: PinoPretty.PrettyOptions;
    }
  | Record<string, never>;

export function UsePrettyLogger(options: PrettyLoggerConfig = {}): void {
  // * Initialize a substitute logger object
  logger =
    "logger" in options
      ? options.logger
      : pino(
          {
            level: AutoLogService.logger.level,
            transport: {
              options: {
                colorize: true,
                crlf: false,
                customPrettifiers: {},
                errorLikeObjectKeys: ["err", "error"],
                errorProps: "",
                hideObject: false,
                ignore: "pid,hostname",
                levelKey: ``,
                messageKey: "msg",
                timestampKey: "time",
                translateTime: "SYS:ddd hh:MM:ss.l",
                // ? Provided values override defaults
                ...options.prettyOptions,
              },
              target: "pino-pretty",
            },
          },
          pino.destination({ sync: true }),
        );

  // * Register with AutoLogService
  AutoLogService.logger = logger;
  AutoLogService.prettyLogger = true;
  AutoLogService.nestLogger = PrettyNestLogger;
  AutoLogService.logger = logger;

  AutoLogService.call = function (
    method: pino.Level,
    context: string,
    ...parameters: Parameters<LoggerFunction>
  ): void {
    // ? Early shortcut for an over used call
    if (method === "trace" && AutoLogService.logger.level !== "trace") {
      return;
    }

    // * If providing an object as the 1st arg
    const logger = AutoLogService.getLogger() as pino.Logger;
    if (is.object(parameters[0])) {
      const data = parameters.shift() as { context?: string };

      // Extract the context property, and use it in place of generated
      if (is.string(data.context) && !is.empty(data.context)) {
        context = data.context;
        delete data.context;
      }

      const message = [
        highlightContext(context, METHOD_COLORS.get(method)),
        prettyFormatMessage(parameters.shift() as string),
      ].join(" ");

      logger[method](data, message, ...parameters);
      return;
    }

    // * Text only log
    const message = [
      highlightContext(context, METHOD_COLORS.get(method)),
      prettyFormatMessage(parameters.shift() as string),
    ].join(" ");
    logger[method](message, ...parameters);
  };
}
