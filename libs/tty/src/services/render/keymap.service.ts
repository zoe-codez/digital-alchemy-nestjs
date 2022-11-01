import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { ARRAY_OFFSET, DOWN, is, UP } from "@steggy/utilities";
import chalk from "chalk";

import { tKeyMap } from "../../contracts";
import { ansiMaxLength, ansiPadEnd } from "../../includes";
import { ApplicationManagerService, KeyboardManagerService } from "../meta";
import { TextRenderingService } from "./text-rendering.service";

type keyItem = {
  description: string;
  label: string;
};
const LINE_PADDING = 2;
interface KeymapHelpOptions {
  current?: unknown;
  message?: string;
  notes?: string;
  onlyHelp?: boolean;
  prefix?: tKeyMap;
}

@Injectable()
export class KeymapService {
  constructor(
    private readonly textRendering: TextRenderingService,
    @Inject(forwardRef(() => KeyboardManagerService))
    private readonly keyboard: KeyboardManagerService,
    private readonly applicationManager: ApplicationManagerService,
  ) {}

  public keymapHelp({
    current,
    message = "",
    notes = " ",
    prefix = new Map(),
    onlyHelp = false,
  }: KeymapHelpOptions = {}): string {
    const map = this.keyboard.getCombinedKeyMap();
    const a = this.buildLines(prefix, current);
    const b = this.buildLines(map, current);

    const biggestLabel = ansiMaxLength(
      a.map(i => i.label),
      b.map(i => i.label),
    );
    const help = [...a, ...b]
      .map(
        item =>
          chalk`{blue.dim > }${ansiPadEnd(item.label, biggestLabel)}  ${
            item.description
          }`,
      )
      .join(`\n`);
    if (onlyHelp) {
      return help;
    }
    const maxLength =
      ansiMaxLength(help.split(`\n`), message.split(`\n`)) + LINE_PADDING;
    if (notes.charAt(notes.length - ARRAY_OFFSET) === "\n") {
      // A trailing newline doesn't render right if it doesn't also include something that actually render
      // Correct for forgetful dev, a blank space works fine
      notes = notes + " ";
    }
    return [
      chalk.blue.dim(
        "=".repeat(Math.max(maxLength, this.applicationManager.headerLength())),
      ),
      notes,
      this.textRendering.pad(help),
    ].join(`\n`);
  }

  private buildLines(map: tKeyMap, current: unknown): keyItem[] {
    return [...map.entries()]
      .filter(([{ powerUser, active }]) => {
        if (powerUser) {
          return false;
        }
        if (active) {
          return active();
        }
        return true;
      })
      .map(([config, target]): keyItem => {
        const active = Object.entries({ ...config.modifiers })
          .filter(([, state]) => state)
          .map(([name]) => chalk.magenta(name));
        const modifiers = is.empty(active)
          ? ""
          : active.join("/") + chalk.cyan("+");
        const activate = config.catchAll
          ? chalk.yellow("default")
          : (Array.isArray(config.key)
              ? config.key.map(i => modifiers + i)
              : [modifiers + config.key]
            )
              .map(i => chalk.yellow.dim(i))
              .join(chalk.gray(", "));
        let description: string = (config.description ?? target) as string;

        if (config.highlight) {
          description =
            config.matchValue === current
              ? config.highlight.valueMatch(description)
              : config.highlight.normal(description);
        } else {
          description = chalk.gray(description);
        }
        return {
          description,
          label: activate,
        };
      })
      .sort((a, b) => (a.label > b.label ? UP : DOWN));
  }
}
