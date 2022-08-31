import { INestApplication } from "@nestjs/common";
import { FIRST, START } from "@steggy/utilities";
import chalk from "chalk";
import { exit } from "process";

import { AutoLogService } from "../services";
import { BootstrapOptions } from "./bootstrap";

/* eslint-disable no-console */

let logger: AutoLogService;
let prettyLog: boolean;
const EXTRA_PREFIX = 4;
const LINE_NUMBER = 8;

const basicError = (error: Error) => {
  console.error(error.name);
  console.error(error.message);
  console.error(error.stack);
  exit();
};
// eslint-disable-next-line radar/cognitive-complexity
const prettyError = (error: Error) => {
  const stack = error.stack.split(`\n`).slice(FIRST);
  console.log();
  console.log(chalk.bgRedBright.white` 👻 FATAL ERROR 👻 `);
  const lines: [string, string[], boolean][] = [];
  let maxMethod = 0;
  let maxPath = 0;
  let maxLine = 0;
  if (stack[START].startsWith("TypeError: ")) {
    stack.shift();
  }
  stack.forEach(line => {
    line = line.trim();
    line = line.slice(line.indexOf(" ")).trim();
    const hasMethod =
      line.indexOf(" ") > line.indexOf("/") || line.includes("(");
    const method = !hasMethod ? "" : line.slice(START, line.indexOf(" "));
    if (hasMethod) {
      line = line.slice(hasMethod ? line.indexOf(" ") : START);
    }
    const parts = line.trim().replace("(", "").replace(")", "").split(":");
    const PA = "Promise.all";
    if (
      parts[START] === "<anonymous>" ||
      parts[START] === "Promise <anonymous>" ||
      parts[START] === "Function <anonymous>" ||
      parts[START].slice(START, PA.length) === PA
    ) {
      maxMethod = Math.max(parts[START].length, maxMethod);
      lines.push([method, [parts[START], "", ""], false]);
      return;
    }
    let localItem = false;
    if (parts.length === EXTRA_PREFIX) {
      const start = parts.shift();
      localItem = start !== "node";
      if (start === "node") {
        parts[START] = `${start}:${parts[START]}`;
      }
    }
    if (parts[START].includes("node_modules")) {
      // These paths go to system root
      // Slice them off to start as "node_modules"
      parts[START] = parts[START].slice(parts[START].indexOf("node_modules"));
    }
    maxMethod = Math.max(maxMethod, method.length);
    maxPath = Math.max(maxPath, parts[START].length);
    maxLine = Math.max(maxLine, parts[FIRST].length);
    lines.push([method, parts, localItem]);
  });
  let foundMostRecent = false;
  console.log(
    chalk.red(
      lines
        .map(([method, parts, isLocal], index) => {
          let color = "";
          if (isLocal && !foundMostRecent) {
            foundMostRecent = true;
            color += ".inverse";
          }
          return chalk`  {cyan${color} ${index})} {${
            isLocal ? "bold" : "dim"
          } ${method.padEnd(maxMethod, " ")}} ${parts
            .shift()
            .padEnd(maxPath, " ")
            .replace(
              "node_modules",
              chalk.dim("node_modules"),
            )} {cyan.bold${color} ${parts.shift().padStart(LINE_NUMBER, " ")}}${
            parts[START] ? chalk`{white :}{cyan${color} ${parts.shift()}}` : ``
          }`;
        })
        .join(`\n`),
    ),
  );
  exit();
};

process.on("uncaughtException", function (error) {
  if (logger) {
    logger.error(`[${error.name}] ${error.message}`);
    if (prettyLog && error.stack) {
      prettyError(error);
    }
  }
  basicError(error);
});
export async function GlobalErrorInit(
  app: INestApplication,
  server,
  options: BootstrapOptions,
): Promise<void> {
  logger = await app.resolve(AutoLogService);
  prettyLog = options.prettyLog;
}
