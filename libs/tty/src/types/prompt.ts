import { is, LABEL, SINGLE, VALUE } from "@digital-alchemy/utilities";

import { PromptEntry } from "../services";
import { BaseSearchOptions, MenuSearchOptions } from "./components";
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

  searchEnabled: (options: MenuSearchOptions) =>
    is.object(options)
      ? (options as BaseSearchOptions).enabled !== false
      : // false is the only allowed boolean
        // undefined = default enabled
        !is.boolean(options),
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

export type ExternalEditorOptions = {
  /**
   * Which path to store the file
   */
  dir?: string;
  /**
   * Which mode to create the file with. e.g. 644
   */
  mode?: number;
  /**
   * A postfix for the file name. Useful if you want to provide an extension
   */
  postfix?: string;
  /**
   * A prefix for the file name.
   */
  prefix?: string;
  /**
   * Value to edit
   */
  text?: string;
  /**
   * Trim the final output
   *
   * > Default: `true`
   */
  trim?: boolean;
};

export type CancelActivate<VALUE> = Promise<VALUE> & {
  cancel: (value: VALUE) => void;
};
