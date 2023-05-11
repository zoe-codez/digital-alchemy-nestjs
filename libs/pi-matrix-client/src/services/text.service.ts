/* eslint-disable @typescript-eslint/no-magic-numbers */
import { AutoLogService, InjectConfig } from "@digital-alchemy/boilerplate";
import { MatrixMathService } from "@digital-alchemy/render-utils";
import {
  Colors,
  DEFAULT_FONT,
  FONTS,
  LIB_RGB_MATRIX,
  TextWidgetDTO,
} from "@digital-alchemy/rgb-matrix";
import { NONE } from "@digital-alchemy/utilities";
import { Inject, Injectable } from "@nestjs/common";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import {
  Font,
  FontInstance,
  HorizontalAlignment,
  LayoutUtils,
  LedMatrixInstance,
  VerticalAlignment,
} from "rpi-led-matrix";

import { FONTS_DIRECTORY } from "../config";
import { MATRIX_INSTANCE } from "../types";

const EXT = "bdf";

@Injectable()
export class TextService {
  public static FONT_LIST: FONTS[];

  constructor(
    private readonly logger: AutoLogService,
    @Inject(MATRIX_INSTANCE)
    private readonly matrix: LedMatrixInstance,
    @InjectConfig(DEFAULT_FONT, LIB_RGB_MATRIX)
    private readonly defaultFont: FONTS,
    @InjectConfig(FONTS_DIRECTORY)
    private readonly root: string,
    private readonly math: MatrixMathService,
  ) {}

  private fonts = new Map<string, FontInstance>();

  public font(font: FONTS): FontInstance {
    this.load(font);
    const requested = this.fonts.get(font);
    if (requested) {
      return requested;
    }
    this.logger.error(
      `[%s] font did not load, falling back to default {%s}`,
      font,
      this.defaultFont,
    );
    return this.font(this.defaultFont);
  }

  public load(name: FONTS): void {
    if (this.fonts.has(name)) {
      return;
    }
    const file = join(this.root, `${name}.${EXT}`);
    if (!existsSync(file)) {
      this.logger.error({ file }, `[%s] cannot find font`, name);
      return;
    }
    this.fonts.set(name, new Font(name, file));
    this.logger.debug(`[%s] loaded font`, name);
  }

  public preloadAllFonts(): void {
    TextService.FONT_LIST.forEach(name => this.load(name));
  }

  public render(widget: Partial<TextWidgetDTO>): void {
    const font = this.fonts.get(widget.font ?? this.defaultFont);
    const glyphs = LayoutUtils.linesToMappedGlyphs(
      LayoutUtils.textToLines(font, this.matrix.width(), widget.text),
      font.height(),
      this.matrix.width(),
      this.matrix.height(),
      widget.horizontal ?? HorizontalAlignment.Left,
      widget.vertical ?? VerticalAlignment.Top,
    );
    this.matrix
      .font(font)
      .fgColor(widget.color ?? Colors.White)
      .brightness(this.math.containBrightness(widget.brightness));

    glyphs.forEach(({ x, y, char }) =>
      this.matrix.drawText(
        char,
        x + (widget.x ?? NONE),
        y + (widget.y ?? NONE),
      ),
    );
  }

  protected onModuleInit(): void {
    TextService.FONT_LIST = readdirSync(this.root)
      .filter(i => i.endsWith(EXT))
      .map(i => i.replace(`.${EXT}`, "") as FONTS);
    this.load(this.defaultFont);
  }
}
