import {
  AbstractConfig,
  AutoLogService,
  ConfigDefinitionDTO,
  ConfigTypeDTO,
  InjectConfig,
  QuickScript,
  StringArrayConfig,
  StringConfig,
  WorkspaceService,
} from "@digital-alchemy/boilerplate";
import {
  ApplicationManagerService,
  MainMenuEntry,
  MenuHelpText,
  PromptService,
  ScreenService,
  TTYModule,
} from "@digital-alchemy/tty";
import {
  deepExtend,
  FIRST,
  is,
  SINGLE,
  START,
  TitleCase,
} from "@digital-alchemy/utilities";
import chalk from "chalk";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { encode } from "ini";
import { dump } from "js-yaml";
import { get, set } from "object-path";
import { dirname } from "path";
import { exit } from "process";

const STRING_ARRAY_LIMIT = 50;
const DASH = chalk.yellow(" - ");
const NO_VALUE = Symbol();
@QuickScript({
  application: "config-builder",
  imports: [TTYModule],
})
export class ConfigScanner {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig("DEFINITION_FILE", {
      default: "./config.json",
      description: "File path to file containing an application scanned config",
      type: "string",
    })
    private readonly definitionFile: string,
    @InjectConfig("CONFIG_FILE", {
      description:
        "Pass value to interact with a specific config file instead of the predefined options",
      type: "string",
    })
    private readonly outputFile: string,
    private readonly workspace: WorkspaceService,
    private readonly screen: ScreenService,
    private readonly prompt: PromptService,
    private readonly applicationManager: ApplicationManagerService,
  ) {}

  private config: AbstractConfig;
  private configDefinition: ConfigDefinitionDTO;
  private readonly dirty = new Map<string, unknown>();
  private loadedFiles: string[] = [];

  private get loadedApplication() {
    return this.configDefinition.application;
  }

  public async exec(defaultValue = "edit") {
    this.applicationManager.setHeader(
      "App Config",
      TitleCase(this.loadedApplication),
    );
    const entries = [
      {
        entry: ["Show loaded config", "print"],
        helpText: `Print the loaded configuration`,
      },
      {
        entry: ["List config files", "list-files"],
        helpText:
          "List all file locations that the script may look for a configuration file at",
      },
      {
        entry: [`Edit configuration`, "edit"],
        helpText: `Change the value of configuration items`,
      },
      {
        entry: ["Write to local file", "write-local"],
        helpText: `Save config to a user config file`,
      },
      {
        entry: ["Output environment variables", "environment"],
        helpText: "Output config as key/value pairs",
      },
    ] as MainMenuEntry[];
    if (!is.empty(this.outputFile)) {
      entries.push({
        entry: [chalk`{cyan **} Write to config file`, "write-config"],
        helpText: chalk`Write to file {bold.cyan ${this.outputFile}}`,
      });
    }
    const action = await this.prompt.menu({
      keyMap: { escape: ["done"] },
      right: entries,
      search: { enabled: false },
      value: defaultValue,
    });
    switch (action) {
      case "done":
        return;
      case "print":
        this.screen.printLine(this.config);
        await this.prompt.acknowledge();
        return await this.exec(action);
      case "list-files":
        this.listConfigFiles();
        this.screen.down();
        await this.prompt.acknowledge();
        return await this.exec(action);
      case "edit":
        await this.selectConfig();
        return await this.exec(action);
      case "environment":
        this.printEnvironment();
        await this.prompt.acknowledge();
        return await this.exec(action);
      case "write-local":
        await this.writeLocal();
        await this.prompt.acknowledge();
        return await this.exec(action);
      case "write-config":
        this.writeConfig();
        await this.prompt.acknowledge();
        return await this.exec(action);
    }
  }

  public onModuleInit(): void | never {
    if (is.empty(this.definitionFile)) {
      this.logger.error(`[DEFINITION_FILE] not provided`);
      exit();
    }
    if (!existsSync(this.definitionFile)) {
      this.logger.error(
        `[DEFINITION_FILE] {${this.definitionFile}} does not exist`,
      );
      exit();
    }
    this.configDefinition = JSON.parse(
      readFileSync(this.definitionFile, "utf8"),
    );
    let configMap = new Map<string, AbstractConfig>();
    if (is.empty(this.outputFile)) {
      const [configs] = this.workspace.loadMergedConfig(
        this.workspace.configFilePaths(this.loadedApplication),
      );
      configMap = configs;
    } else {
      this.workspace.loadConfigFromFile(configMap, this.outputFile);
    }
    const mergedConfig: AbstractConfig = is.undefined(
      this.configDefinition.bootstrapOverrides,
    )
      ? {}
      : JSON.parse(JSON.stringify(this.configDefinition.bootstrapOverrides));
    configMap.forEach(config => deepExtend(mergedConfig, config));
    this.loadedFiles = [...configMap.keys()];
    this.config = mergedConfig;
  }

  private buildMenuEntry(
    item: ConfigTypeDTO,
    currentValue: unknown,
  ): MainMenuEntry<ConfigTypeDTO> {
    let helpText: MenuHelpText = item.metadata.description;
    const defaultValue = this.getDefaultValue(item);
    if (defaultValue) {
      const color =
        {
          boolean: "green",
          internal: "magenta",
          number: "yellow",
        }[item.metadata.type] ?? "white";
      const formatted = is.object(defaultValue)
        ? JSON.stringify(defaultValue, undefined, "  ")
        : defaultValue;
      helpText = [
        chalk`{blue Default Value:} {${color} ${formatted}}`,
        // ...item
        chalk` {cyan.bold > }${helpText}`,
      ];
    }
    const color = [defaultValue, undefined].includes(currentValue)
      ? "white"
      : "green.bold";
    let required = "";
    if (item.metadata.required) {
      required = chalk.red`* `;
    }
    return {
      entry: [chalk`{${color} ${required}${item.property}}`, item],
      helpText,
      type:
        item.library === this.loadedApplication
          ? chalk.blue("* ") + TitleCase(item.library)
          : TitleCase(item.library),
    };
  }

  private async editConfig(config: ConfigTypeDTO): Promise<void> {
    const path = this.path(config);
    let current = get(this.config, path, this.getDefaultValue(config));
    let result: unknown;
    switch (config.metadata.type) {
      case "boolean":
        result = await this.prompt.boolean({
          current: Boolean(current),
          label: config.property,
        });
        break;
      case "number":
        result = await this.prompt.number({
          current: Number(current),
          label: config.property,
        });
        break;
      case "record":
        current = is.object(current) ? current : {};
        result = await this.prompt.arrayBuilder<{
          key: string;
          value: string;
        }>({
          current: Object.entries(current).map(([key, value]) => ({
            key,
            value,
          })),
          elements: [
            { name: "Key", path: "key", type: "string" },
            { name: "Value", path: "value", type: "string" },
          ],
          labelPath: "key",
        });
        result = Object.fromEntries(
          (result as { key: string; value: string }[]).map(({ key, value }) => [
            key,
            value,
          ]),
        );
        break;
      case "string":
        const { metadata } = config as ConfigTypeDTO<StringConfig>;
        result = is.array(metadata.enum)
          ? await this.prompt.pickOne({
              current,
              headerMessage: config.property,
              options: metadata.enum.map(i => ({ entry: [i] })),
            })
          : await this.prompt.string({
              current: String(current),
              label: config.property,
            });
        break;
      case "string[]":
        result = await this.stringArray(
          config as ConfigTypeDTO<StringArrayConfig>,
          current as string[],
        );
        break;
      default:
        await this.prompt.acknowledge({
          label: chalk.red`"${config.metadata.type}" editor not supported`,
        });
    }
    // await sleep(5000);
    set(this.config, path, result);
    // Track the original value as loaded by script
    if (this.dirty.get(path) === result) {
      this.dirty.delete(path);
      return;
    }
    if (!this.dirty.has(path)) {
      this.dirty.set(path, current);
    }
  }

  private getDefaultValue(config: ConfigTypeDTO) {
    return get(
      this.configDefinition.bootstrapOverrides,
      this.path(config),
      config?.metadata?.default,
    );
  }

  private listConfigFiles(): void {
    if (is.empty(this.loadedApplication)) {
      this.logger.error(`[APPLICATION] not provided`);
      return;
    }
    const list = this.workspace.configFilePaths(this.loadedApplication);
    this.applicationManager.setHeader("Config Files");
    this.screen.printLine(
      chalk`Potential configuration files for {blue.bold ${this.loadedApplication}}`,
    );
    list.forEach(item =>
      this.screen.printLine(
        chalk`  {${existsSync(item) ? "green" : "red"} ${item}}`,
      ),
    );
    this.screen.printLine(
      `\nAt runtime, final configuration values are resolved using these priorities:`,
    );
    this.screen.printLine(chalk` {yellow -} values from developer as defaults`);
    this.screen.printLine(
      chalk` {yellow -} values from files (loaded in descending order and merged)`,
    );
    this.screen.printLine(chalk` {yellow -} values from environment variables`);
    this.screen.printLine(chalk` {yellow -} values from command line switches`);
  }

  private path(config: ConfigTypeDTO): string {
    if (
      !is.empty(config.library) &&
      config.library !== this.loadedApplication
    ) {
      return `libs.${config.library}.${config.property}`;
    }
    return `application.${config.property}`;
  }

  /**
   * Dump as environment variables appropriate for docker containers
   */
  private printEnvironment(): void {
    const environment: string[] = [];
    this.configDefinition.config.forEach(config => {
      const path = this.path(config);
      let value: unknown = get(this.config, path, NO_VALUE);
      if (value === NO_VALUE || value === this.getDefaultValue(config)) {
        return;
      }
      if (!is.string(value)) {
        value = is.object(value) ? JSON.stringify(value) : String(value);
      }
      environment.push(`${config.property}=${value}`);
    });
    this.screen.down();
    if (is.empty(environment)) {
      this.screen.printLine(chalk`  {yellow No variables to provide}`);
      this.screen.down();
      return;
    }
    this.screen.printLine(environment.join(`\n`));
    this.screen.down();
  }

  /**
   * Build a fancy menu prompt to display all the configuration options grouped by project
   */
  private async selectConfig(initial?: ConfigTypeDTO): Promise<void> {
    const mergedConfig = this.config;
    const item = await this.prompt.menu({
      keyMap: { escape: ["done"] },
      right: this.configDefinition.config.map(item => {
        const prefix =
          this.loadedApplication === item.library
            ? "application"
            : `libs.${item.library}`;
        let currentValue = get(
          mergedConfig,
          `${prefix}.${item.property}`,
        ) as unknown;
        if (!is.undefined(currentValue)) {
          switch (item.metadata.type) {
            case "number":
              currentValue = Number(currentValue);
              break;
            case "boolean":
              if (is.string(currentValue)) {
                currentValue = ["false", "n"].includes(
                  currentValue.toLowerCase(),
                );
                break;
              }
              currentValue = Boolean(currentValue);
          }
        }
        return this.buildMenuEntry(item, currentValue);
      }),
      value: initial,
    });
    if (is.string(item)) {
      return;
    }
    await this.editConfig(item);
    // re-re-recursion!
    return await this.selectConfig(item);
  }

  private async stringArray(
    config: ConfigTypeDTO<StringArrayConfig>,
    current: string[] = [],
    lastAction = "",
  ): Promise<string[]> {
    let headerMessage = ``;
    if (is.empty(current)) {
      headerMessage += chalk`{yellow 0} values`;
    } else {
      headerMessage +=
        current.length <= STRING_ARRAY_LIMIT
          ? chalk`{blue ${current.length}} values\n` +
            current.map(i => DASH + i).join(`\n`)
          : chalk`{blue ${current.length}} values\n` +
            current
              .slice(START, STRING_ARRAY_LIMIT)
              .map(i => DASH + i)
              .join(`\n`) +
            chalk`\n ... {red ${
              current.length - STRING_ARRAY_LIMIT
            }} additional`;
    }
    const action = await this.prompt.menu({
      headerMessage,
      keyMap: { escape: ["done"] },
      right: [
        { entry: ["Add", "add"] },
        { entry: ["Remove single", "remove"] },
        { entry: ["Clear all", "truncate"] },
      ],
      value: lastAction,
    });
    if (action === "done") {
      return current;
    }
    if (action === "add") {
      const value = await this.prompt.string({
        current: String(config.metadata.default ?? ""),
        label: config.property,
        placeholder: config.metadata.description,
      });
      return await this.stringArray(config, [...current, value], action);
    }
    if (action === "remove") {
      const value = await this.prompt.pickOne<number>({
        headerMessage: "Which item to remove?",
        options: current.map((i, index) => ({ entry: [i, index] })),
      });
      // Remove single item from array at index
      current.splice(value, SINGLE);
      return await this.stringArray(config, current, action);
    }
    if (action === "truncate") {
      return await this.stringArray(config, [], action);
    }
    // wat
    return [];
  }

  private writeConfig(target = this.outputFile): void {
    const environment: AbstractConfig = {};
    this.configDefinition.config.forEach(config => {
      const path = this.path(config);
      const value: unknown = get(this.config, path, NO_VALUE);
      if (value === NO_VALUE || value === this.getDefaultValue(config)) {
        return;
      }
      set(environment, this.path(config), value);
    });
    const extension = target.split(".").pop().toLowerCase();
    let contents: string;
    switch (extension) {
      case "json":
        contents = JSON.stringify(environment, undefined, "  ");
        break;
      case "yaml":
      case "yml":
        contents = dump(environment);
        break;
      default:
        contents = encode(environment);
    }
    const path = dirname(target);
    mkdirSync(path, { recursive: true });
    writeFileSync(target, contents);
  }

  private async writeLocal(): Promise<void> {
    const list = this.workspace.configFilePaths(this.loadedApplication);
    const defaultValue =
      this.loadedFiles[FIRST] ?? list.find(path => path.includes(".config"));
    const target = await this.prompt.menu({
      right: list.map(item => ({ entry: [item] })),
      value: defaultValue,
    });
    this.writeConfig(target);
  }
}
