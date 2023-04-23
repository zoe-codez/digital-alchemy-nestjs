import { each, is } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import chalk from "chalk";

import {
  DirectCB,
  KeyDescriptor,
  KeyModifiers,
  TTYComponentKeymap,
} from "../types";
import { ApplicationManagerService } from "./application-manager.service";
import { ScreenService } from "./screen.service";

@Injectable()
export class KeyboardManagerService {
  constructor(
    private readonly screen: ScreenService,
    @Inject(forwardRef(() => ApplicationManagerService))
    private readonly applicationManager: ApplicationManagerService,
  ) {}
  private activeKeymaps: Map<unknown, TTYComponentKeymap> = new Map();

  public focus<T>(
    target: unknown,
    map: TTYComponentKeymap,
    value: Promise<T>,
  ): Promise<T> {
    return new Promise(async done => {
      const currentMap = this.activeKeymaps;
      this.activeKeymaps = new Map([[target, map]]);
      const out = await value;
      this.activeKeymaps = currentMap;
      done(out);
    });
  }

  public getCombinedKeyMap(): TTYComponentKeymap {
    const map: TTYComponentKeymap = new Map();
    this.activeKeymaps.forEach(sub => sub.forEach((a, b) => map.set(b, a)));
    return map;
  }
  public load(item: Map<unknown, TTYComponentKeymap>): void {
    this.activeKeymaps = item;
  }

  public save(): Map<unknown, TTYComponentKeymap> {
    const current = this.activeKeymaps;
    this.activeKeymaps = new Map();
    return current;
  }

  public setKeymap(target: unknown, ...mapList: TTYComponentKeymap[]): void {
    const result: TTYComponentKeymap = new Map();
    mapList.forEach(keMap =>
      keMap.forEach((callback, options) => {
        result.set(options, callback);
      }),
    );
    this.activeKeymaps.set(target, result);
    result.forEach(key => {
      if (is.string(key) && !is.function(target[key])) {
        this.screen.printLine(
          chalk.yellow.inverse` MISSING CALLBACK {bold ${key}} `,
        );
      }
    });
  }

  /**
   * Implies ApplicationManager#wrap()
   */
  public async wrap<T>(callback: () => Promise<T>): Promise<T> {
    const application = this.applicationManager.activeApplication;
    const map = this.save();
    const result = await callback();
    this.load(map);
    this.applicationManager.activeApplication = application;
    return result;
  }

  protected onApplicationBootstrap(): void {
    const rl = this.screen.rl;
    rl.input.on("keypress", (value, key = {}) => {
      this.keyPressHandler({ key, value });
    });
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async keyPressHandler(descriptor: KeyDescriptor): Promise<void> {
    if (is.empty(this.activeKeymaps)) {
      return;
    }
    const { key } = descriptor;
    const { ctrl, meta, shift, name, sequence } = key ?? {};
    let mixed = name ?? sequence ?? "enter";
    // Standardize the "done" key
    mixed = mixed === "return" ? "enter" : mixed;
    const catchAll: [unknown, string | DirectCB][] = [];
    const direct: [unknown, string | DirectCB][] = [];
    const modifiers: KeyModifiers = { ctrl, meta, shift };

    // Build list of callbacks based on key
    this.activeKeymaps.forEach((map, target) => {
      map.forEach((callback, options) => {
        if (is.undefined(options.key)) {
          catchAll.push([target, callback]);
          return;
        }
        const keys = [options.key].flat();
        if (!keys.includes(mixed)) {
          return;
        }
        const allMatch = Object.entries(options.modifiers ?? {}).every(
          ([modifier, value]) => modifiers[modifier] === value,
        );
        if (!allMatch) {
          return;
        }
        direct.push([target, callback]);
      });
    });
    // If there are any that directly look for this combination, then only use those
    // Otherwise, use all the catchall callbacks
    const list = is.empty(direct) ? catchAll : direct;
    // Do not re-render if no listeners are present at all
    // const render = !is.empty(list);
    await each(list, async ([target, key]) => {
      await (is.string(key) ? target[key].bind(target) : key)(mixed, modifiers);
    });
  }
}
