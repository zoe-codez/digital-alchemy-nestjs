import { is } from "@digital-alchemy/utilities";
import chalk from "chalk";

export function MergeHelp(
  message: string,
  { helpText = "" }: { helpText?: string } = {},
) {
  if (!is.empty(helpText)) {
    message += chalk`\n \n {blue.dim ?} ${helpText
      .split("\n")
      .map(line => line.replace(new RegExp("^ -"), chalk.cyan("   -")))
      .join("\n")}`;
  }
  return message;
}
