import { MainMenuEntry } from "../keyboard";

export interface ListBuilderOptions<T = unknown> {
  current?: MainMenuEntry<T | string>[];
  items?: string;
  source: MainMenuEntry<T | string>[];
}
