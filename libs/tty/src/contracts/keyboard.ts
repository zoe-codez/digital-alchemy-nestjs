import { Key } from "readline";
export type KeyDescriptor = { key: Key; value?: string };
export type MenuEntry<T extends unknown = string> = [string, T] | [string];
export interface MainMenuEntry<T = unknown> {
  entry: MenuEntry<T>;
  /**
   * Additional help text to display when this entry is selected
   */
  helpText?: string;
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
export interface TTYKeypressOptions {
  active?: () => boolean;
  catchAll?: boolean;
  description?: string;
  key?: string | string[];
  modifiers?: Partial<KeyModifiers>;
  /**
   * Leave it to the user to find this, don't document on UI
   *
   * May be useful for items with many keys that map to the same thing (0-9 for example)
   */
  powerUser?: boolean;
}
