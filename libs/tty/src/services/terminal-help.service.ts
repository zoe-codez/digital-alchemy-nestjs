import {
  ACTIVE_APPLICATION,
  AnyConfig,
  AutoConfigService,
  BaseConfig,
  BooleanConfig,
  InjectConfig,
  NumberConfig,
  StringConfig,
} from "@digital-alchemy/boilerplate";
import {
  DOWN,
  EMPTY,
  INCREMENT,
  is,
  TitleCase,
  UP,
} from "@digital-alchemy/utilities";
import { Inject, Injectable } from "@nestjs/common";
import chalk from "chalk";
import { exit } from "process";

import { HELP } from "../config";
import { ansiMaxLength } from "../includes";
import { ApplicationManagerService } from "./application-manager.service";
import { ScreenService } from "./screen.service";

@Injectable()
export class TerminalHelpService {
  constructor(
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly applicationManager: ApplicationManagerService,
    private readonly screen: ScreenService,
    @InjectConfig(HELP) private readonly showHelp: boolean,
    private readonly config: AutoConfigService,
  ) {}

  protected onRewire(): void | never {
    if (!this.showHelp) {
      return;
    }
    const { configDefinitions } = this.config;
    const application = this.application;
    this.applicationManager.setHeader("Help");
    const ALL_SWITCHES: string[] = [];

    configDefinitions.forEach(configuration =>
      ALL_SWITCHES.push(
        ...Object.entries(configuration).map(([property]) => property),
      ),
    );
    this.screen.down();
    const LONGEST =
      Math.max(...ALL_SWITCHES.map(line => line.length)) + INCREMENT;
    this.printProject(application, configDefinitions.get(application), LONGEST);
    configDefinitions.forEach((configuration, project) => {
      if (project === application) {
        return;
      }
      this.printProject(project, configuration, LONGEST);
    });
    exit();
  }

  protected printProject(
    project: string,
    configuration: Record<string, AnyConfig>,
    LONGEST: number,
  ) {
    this.screen.printLine(
      chalk`Provided by {magenta.bold ${TitleCase(project)}}`,
    );
    Object.entries(configuration)
      .sort(([a], [b]) => (a > b ? UP : DOWN))
      .forEach(([property, config]) => {
        property = property
          .replaceAll("-", "_")
          .toLocaleLowerCase()
          .padEnd(LONGEST, " ");
        switch (config.type) {
          case "number":
            this.numberSwitch(property, config as NumberConfig);
            break;
          case "string":
            this.stringSwitch(property, config as StringConfig);
            break;
          case "boolean":
            this.booleanSwitch(property, config as BooleanConfig);
            break;
          default:
            return;
            this.otherSwitch(property, config);
        }
        this.screen.down();
      });
  }

  private booleanSwitch(property: string, config: BooleanConfig): void {
    const prefix = chalk`  {${
      config.required ? "red.bold" : "white"
    } --${property}} {gray [{bold boolean}}${
      is.undefined(config.default as boolean)
        ? ""
        : chalk`, {gray default}: {bold.green ${config.default}}`
    }{gray ]} `;
    this.screen.printLine(this.formatDescription(prefix, config.description));
  }

  private formatDescription(prefix: string, description: string) {
    description ||= "No description";
    const size = ansiMaxLength(prefix);
    return (
      prefix +
      description
        .split(". ")
        .map((line, index) =>
          index === EMPTY ? line : " ".repeat(size) + line,
        )
        .join(`.\n`)
    );
  }

  private numberSwitch(property: string, config: NumberConfig): void {
    const prefix = chalk`  {${
      config.required ? "red.bold" : "white"
    } --${property}} {gray [{bold number}}${
      is.undefined(config.default as number)
        ? ""
        : chalk`, {gray default}: {bold.yellow ${config.default}}`
    }{gray ]} `;
    this.screen.printLine(this.formatDescription(prefix, config.description));
  }

  private otherSwitch(property: string, config: BaseConfig) {
    const prefix = chalk`  {${
      config.required ? "red.bold" : "white"
    } --${property}} {gray [other}${
      is.undefined(config.default)
        ? ""
        : chalk`, {gray default}: {bold.magenta ${JSON.stringify(
            config.default,
          )}}`
    }{gray ]} `;
    this.screen.printLine(this.formatDescription(prefix, config.description));
  }

  private stringSwitch(property: string, config: StringConfig): void {
    let enums = "";
    if (is.empty(config.enum)) {
      const enumList = config.enum
        .map(item => chalk.blue(item))
        .join(chalk("{yellow.dim  | }"));
      enums = chalk`{gray , enum}: ${enumList}`;
    }

    const defaultValue = is.empty(config.default)
      ? ""
      : chalk`, {gray default}: {bold.blue ${config.default}}`;

    const color = config.required ? "red.bold" : "white";

    const prefix = chalk`  {${color} --${property}} {gray [{bold string}}${defaultValue}${enums}{gray ]} `;
    this.screen.printLine(this.formatDescription(prefix, config.description));
  }
}
