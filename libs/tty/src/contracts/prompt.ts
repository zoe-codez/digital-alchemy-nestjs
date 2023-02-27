import { is, LABEL, SINGLE, VALUE } from "@steggy/utilities";

import { PromptEntry } from "../services";
import { MainMenuEntry } from "./keyboard";

export type PromptMenuItems<T extends unknown = string> = {
  name: string;
  short?: string;
  value: T;
}[];

export const TTY = {
  /**
   * Standardized method for retrieving values from menu entries, and casting it
   */
  GV: <T = string>(item: { entry: PromptEntry<T> } | PromptEntry<T>): T => {
    if (!is.array(item)) {
      item = item?.entry;
    }
    if (is.empty(item)) {
      return undefined;
    }
    return item.length === SINGLE
      ? (item[LABEL] as unknown as T)
      : (item[VALUE] as T);
  },
};

export interface PromptAcknowledgeOptions {
  label?: string;
}

export interface PromptBooleanOptions {
  current?: boolean;
  label: string;
}

export interface PromptConfirmOptions {
  current?: boolean;
  label?: string;
}

export interface PromptPasswordOptions {
  current?: string;
  label?: string;
}

export interface PromptPickOneOptions<VALUE extends unknown = string> {
  current?: string | VALUE;
  headerMessage?: string;
  options: MainMenuEntry<VALUE>[];
}

export interface PromptTimeOptions {
  current?: Date;
  label?: string;
}
