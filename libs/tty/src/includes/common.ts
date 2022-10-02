import { is } from "@steggy/utilities";
import chalk from "chalk";

export function MergeHelp(
  message: string,
  selectedItem: { helpText?: string },
) {
  if (!is.empty(selectedItem?.helpText)) {
    message += chalk`\n \n {blue.dim ?} ${selectedItem.helpText
      .split(`\n`)
      .map(line => line.replace(new RegExp("^ -"), chalk.cyan("   -")))
      .join(`\n`)}`;
  }
  return message;
}
