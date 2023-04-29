import { InjectConfig } from "@digital-alchemy/boilerplate";
import { is, START } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import chalk from "chalk";
import figlet, { Fonts } from "figlet";

import {
  APPLICATION_PADDING_LEFT,
  APPLICATION_PADDING_TOP,
  HEADER_COLOR_PRIMARY,
  HEADER_COLOR_SECONDARY,
  HEADER_FONT_PRIMARY,
  HEADER_FONT_SECONDARY,
} from "../config";
import { iBuilderEditor, iComponent } from "../decorators";
import { ansiMaxLength, template } from "../includes";
import { ComponentExplorerService, EditorExplorerService } from "./explorers";
import { KeyboardManagerService } from "./keyboard-manager.service";
import { ScreenService } from "./screen.service";

@Injectable()
export class ApplicationManagerService {
  constructor(
    @InjectConfig(HEADER_FONT_PRIMARY) private readonly primaryFont: Fonts,
    @InjectConfig(HEADER_FONT_SECONDARY) private readonly secondaryFont: Fonts,
    @InjectConfig(APPLICATION_PADDING_TOP)
    private readonly paddingTop: number,
    @InjectConfig(HEADER_COLOR_PRIMARY)
    private readonly colorPrimary: string,
    @InjectConfig(HEADER_COLOR_SECONDARY)
    private readonly colorSecondary: string,
    @InjectConfig(APPLICATION_PADDING_LEFT)
    private readonly paddingLeft: number,
    private readonly editorExplorer: EditorExplorerService,
    private readonly componentExplorer: ComponentExplorerService,
    @Inject(forwardRef(() => ScreenService))
    private readonly screen: ScreenService,
    @Inject(forwardRef(() => KeyboardManagerService))
    private readonly keyboard: KeyboardManagerService,
  ) {
    this.leftPadding = " ".repeat(this.paddingLeft);
  }

  public activeApplication: iComponent;
  private activeEditor: iBuilderEditor;
  private header = "";
  private readonly leftPadding: string;
  private parts: [primary: string, secondary: string] | [primary: string] = [
    "",
  ];

  /**
   * Start an component instance, and set it as the primary active bit
   */
  public async activateComponent<CONFIG, VALUE>(
    name: string,
    configuration: CONFIG = {} as CONFIG,
  ): Promise<VALUE> {
    const oldApplication = this.activeApplication;
    const oldEditor = this.activeEditor;
    this.activeApplication = undefined;
    this.activeEditor = undefined;
    const out = await this.keyboard.wrap<VALUE>(
      async () =>
        await new Promise<VALUE>(async done => {
          const component = this.componentExplorer.findServiceByType<
            CONFIG,
            VALUE
          >(name);
          if (!component) {
            this.screen.printLine(
              // ? It probably wasn't listed in the providers anywhere
              chalk.bgRed.bold
                .white` Cannot find component {underline ${name}} `,
            );
            return;
          }
          // There needs to be more type work around this
          // It's a disaster
          await component.configure(configuration, value =>
            done(value as VALUE),
          );
          this.activeApplication = component;
          component.render();
        }),
    );
    this.activeApplication = oldApplication;
    this.activeEditor = oldEditor;
    return out;
  }

  /**
   * Start an editor instance, and set it as the primary active bit
   */
  public async activateEditor<CONFIG, VALUE>(
    name: string,
    configuration: CONFIG = {} as CONFIG,
  ): Promise<VALUE> {
    return await this.keyboard.wrap<VALUE>(async () => {
      const component = this.activeApplication;
      this.activeApplication = undefined;
      const promise = new Promise<VALUE>(done => {
        const editor = this.editorExplorer.findServiceByType(name);
        editor.configure(configuration, value => done(value as VALUE));
        this.activeEditor = editor;
        editor.render();
      });
      const result = await promise;
      this.activeEditor = undefined;
      this.activeApplication = component;
      return result;
    });
  }

  /**
   * How wide is the header message at it's widest?
   */
  public headerLength(): number {
    return ansiMaxLength(this.header);
  }

  /**
   * Internal use
   */
  public render(): void {
    this.activeApplication?.render();
    this.activeEditor?.render();
  }

  /**
   * Clear the screen, and re-render the previous header
   */
  public reprintHeader(): void {
    this.screen.clear();
    const [a, b] = this.parts;
    this.setHeader(a, b);
  }

  /**
   * Clear the screen, and place a new header message at the top of the screen
   */
  public setHeader(primary = "", secondary = ""): number {
    this.parts = [primary, secondary];
    this.screen.clear();
    for (let i = START; i < this.paddingTop; i++) {
      this.screen.printLine();
    }
    if (is.empty(secondary)) {
      secondary = primary;
      primary = "";
    } else {
      primary = this.headerPad(
        figlet.textSync(primary, {
          font: this.primaryFont,
        }),
        this.colorPrimary,
      );
    }
    if (is.empty(secondary)) {
      this.header = primary;
      return;
    }
    if (!is.empty(primary)) {
      this.screen.printLine();
    }
    secondary = this.headerPad(
      figlet.textSync(secondary, {
        font: this.secondaryFont,
      }),
      this.colorSecondary,
    );
    this.header = `${primary}${secondary}`;
    return this.headerLength();
  }

  private headerPad(text: string, color: string): string {
    text = template(`{${color} ${text.trim()}}`)
      .split(`\n`)
      .map(i => this.leftPadding + i)
      .join(`\n`);
    this.screen.printLine(text);
    return text;
  }
}
