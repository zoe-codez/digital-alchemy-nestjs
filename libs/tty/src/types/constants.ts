import chalk from "chalk";

export const TABLE_PARTS = {
  bottom: "─",
  bottom_left: "└",
  bottom_mid: "┴",
  bottom_right: "┘",
  left: "│",
  left_mid: "├",
  mid: "─",
  mid_mid: "┼",
  middle: "│",
  right: "│",
  right_mid: "┤",
  top: "─",
  top_left: "┌",
  top_mid: "┬",
  top_right: "┐",
} as const;
Object.keys(TABLE_PARTS).forEach(
  key => (TABLE_PARTS[key] = chalk.gray.dim(TABLE_PARTS[key])),
);
