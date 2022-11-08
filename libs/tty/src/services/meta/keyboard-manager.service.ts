import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { each, is } from "@steggy/utilities";
import chalk from "chalk";

import {
  ApplicationStackProvider,
  DirectCB,
  iStackProvider,
  KeyDescriptor,
  KeyModifiers,
  tKeyMap,
} from "../../contracts";
import { ApplicationManagerService } from "./application-manager.service";
import { ScreenService } from "./screen.service";

@Injectable()
@ApplicationStackProvider()
export class KeyboardManagerService implements iStackProvider {
  constructor(
    private readonly screen: ScreenService,
    @Inject(forwardRef(() => ApplicationManagerService))
    private readonly applicationManager: ApplicationManagerService,
  ) {}
  private activeKeymaps: Map<unknown, tKeyMap> = new Map();

  public focus<T>(
    target: unknown,
    map: tKeyMap,
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

  public getCombinedKeyMap(): tKeyMap {
    const map: tKeyMap = new Map();
    this.activeKeymaps.forEach(sub => sub.forEach((a, b) => map.set(b, a)));
    return map;
  }
  public load(item: Map<unknown, tKeyMap>): void {
    this.activeKeymaps = item;
  }

  public save(): Map<unknown, tKeyMap> {
    const current = this.activeKeymaps;
    this.activeKeymaps = new Map();
    return current;
  }

  public setKeyMap(target: unknown, ...mapList: tKeyMap[]): void {
    const result: tKeyMap = new Map();
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
    return await this.applicationManager.wrap(
      () =>
        new Promise(async done => {
          const map = this.save();
          const result = await callback();
          this.load(map);
          done(result);
        }),
    );
  }

  protected onApplicationBootstrap(): void {
    const rl = this.screen.rl;
    rl.input.on("keypress", (value, key = {}) => {
      this.keyPressHandler({ key, value });
    });
  }

  // eslint-disable-next-line radar/cognitive-complexity
  private async keyPressHandler(descriptor: KeyDescriptor): Promise<void> {
    if (is.empty(this.activeKeymaps)) {
      return;
    }
    const application = this.applicationManager.activeApplication;
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
        const keys = Array.isArray(options.key) ? options.key : [options.key];
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
    let render = !is.empty(list);
    await each(is.empty(direct) ? catchAll : direct, async ([target, key]) => {
      const result = await (is.string(key) ? target[key].bind(target) : key)(
        mixed,
        modifiers,
      );

      if (result === false) {
        // This logic needs to be improved
        // If any single one of these returns false, then a render is stopped
        render = false;
      }
    });
    if (render && this.applicationManager.activeApplication === application) {
      this.applicationManager.render();
    }
  }
}
