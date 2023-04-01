import { Key } from "readline";

import { HighlightCallbacks } from "./components";

export type KeyDescriptor = { key: Key; value?: string };
export type MenuEntry<T extends unknown = string> =
  | [label: string, value: T]
  | [label_and_value: string];

export type MenuHelpText = string | string[] | object;

export interface MainMenuEntry<T = unknown> {
  /**
   * label and/or value
   */
  entry: MenuEntry<T>;
  /**
   * Additional help text to display when this entry is selected
   *
   * - string format: pass through
   * - string array: join together with newlines
   * - object: debug formatting
   */
  helpText?: MenuHelpText;
  /**
   * label prefix icon works with color, and any character or fontawesome icon
   */
  icon?: string;
  /**
   * sort by priority (default = 0) > sort by label
   */
  priority?: number;
  /**
   * Used to group entries into categories
   */
  type?: string;
}
export type tKeyMap = Map<TTYKeypressOptions, string | DirectCB>;

export type KeyModifiers = Record<"ctrl" | "shift" | "meta", boolean>;

export type DirectCB = (
  key: string,
  mods: KeyModifiers,
) => void | boolean | Promise<void | boolean>;

export type TTYKeypressOptions = {
  active?: () => boolean;
  catchAll?: boolean;
  description?: string;
  highlight?: HighlightCallbacks;
  key?: string | string[];
  matchValue?: unknown;
  modifiers?: Partial<KeyModifiers>;
  /**
   * Leave it to the user to find this, don't document on UI
   *
   * May be useful for items with many keys that map to the same thing (0-9 for example)
   */
  powerUser?: boolean;
};
