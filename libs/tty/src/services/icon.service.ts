import { Injectable } from "@nestjs/common";
import { InjectConfig } from "@steggy/boilerplate";
import chalk from "chalk";

import { USE_FONTAWESOME_ICONS } from "../config";
import { FontAwesomeIcons } from "../icons";

export enum TTYIcons {
  toggle_on = "toggle_on",
  toggle_off = "toggle_off",
}
const IconMap = new Map<TTYIcons, string[]>([
  [
    TTYIcons.toggle_on,
    [FontAwesomeIcons.toggle_on, "*"].map(i => chalk.green(i)),
  ],
  [
    TTYIcons.toggle_off,
    [FontAwesomeIcons.toggle_off, "*"].map(i => chalk.red(i)),
  ],
]);

@Injectable()
export class IconService {
  constructor(
    @InjectConfig(USE_FONTAWESOME_ICONS) private readonly useIcons: boolean,
  ) {}

  public getIcon(name: `${TTYIcons}`): string {
    const [icon, normal] = IconMap.get(name as TTYIcons);
    return this.useIcons ? icon : normal;
  }
}
