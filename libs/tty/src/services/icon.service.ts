import { InjectConfig } from "@digital-alchemy/boilerplate";
import { Injectable } from "@nestjs/common";
import chalk from "chalk";

import { USE_FONTAWESOME_ICONS } from "../config";
import { FontAwesomeIcons } from "../icons";

export enum TTYReplacementIcons {
  toggle_on = "toggle_on",
  toggle_off = "toggle_off",
}
const IconMap = new Map<TTYReplacementIcons, string[]>([
  [
    TTYReplacementIcons.toggle_on,
    [FontAwesomeIcons.toggle_on, "*"].map(i => chalk.green(i)),
  ],
  [
    TTYReplacementIcons.toggle_off,
    [FontAwesomeIcons.toggle_off, "*"].map(i => chalk.red(i)),
  ],
]);

@Injectable()
export class IconService {
  constructor(
    @InjectConfig(USE_FONTAWESOME_ICONS) private readonly useIcons: boolean,
  ) {}

  public getIcon(name: `${TTYReplacementIcons}`): string {
    const [icon, normal] = IconMap.get(name as TTYReplacementIcons);
    return this.useIcons ? icon : normal;
  }
}
