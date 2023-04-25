/* eslint-disable @typescript-eslint/no-magic-numbers */
import { AutoLogService, InjectConfig } from "@digital-alchemy/boilerplate";
import {
  Colors,
  DEFAULT_FONT,
  FONTS,
  LIB_RGB_MATRIX,
  TextWidgetDTO,
} from "@digital-alchemy/rgb-matrix";
import { EMPTY } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { readdirSync } from "fs";
import { join } from "path";
import { cwd } from "process";
import {
  Font,
  FontInstance,
  HorizontalAlignment,
  LayoutUtils,
  VerticalAlignment,
} from "rpi-led-matrix";

import { MatrixService } from "./matrix.service";

let FONT_LIST: FONTS[];
const EXT = "bdf";
const MAX_BRIGHTNESS = 255;

@Injectable()
export class TextService {
  constructor(
    private readonly logger: AutoLogService,
    @Inject(forwardRef(() => MatrixService))
    private readonly loader: MatrixService,
    @InjectConfig(DEFAULT_FONT, LIB_RGB_MATRIX)
    private readonly defaultFont: FONTS,
  ) {}

  public fonts = new Map<string, FontInstance>();
  private root = join(cwd(), "fonts");

  private get matrix() {
    return this.loader.matrix;
  }

  public font(font: FONTS) {
    this.load(font);
    return this.matrix.font(this.fonts.get(font));
  }

  public load(name: FONTS): void {
    if (this.fonts.has(name)) {
      return;
    }
    this.fonts.set(name, new Font(name, join(this.root, `${name}.${EXT}`)));
  }
  public preloadAllFonts(): void {
    FONT_LIST.forEach(name => this.load(name));
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
      .brightness(widget.brightness ?? MAX_BRIGHTNESS);

    glyphs.forEach(({ x, y, char }) =>
      this.matrix.drawText(
        char,
        x + (widget.x ?? EMPTY),
        y + (widget.y ?? EMPTY),
      ),
    );
  }

  // public async scrolling(
  //   widget: Partial<ScrollingTextWidgetDTO>,
  // ): Promise<void> {
  //   const font = this.fonts.get(widget.font ?? this.defaultFont);
  //   const lines = LayoutUtils.textToLines(
  //     font,
  //     this.matrix.width(),
  //     widget.text,
  //   );
  //   const kerning = widget.kerning || EMPTY;
  //   let totalLength = 0;
  //   lines.forEach(line => {
  //     line.forEach(words => {
  //       words.forEach(glyph => {
  //         totalLength += glyph.w + kerning;
  //       });
  //     });
  //   });
  //   totalLength += this.matrix.width() - kerning;
  //   let scrollPosition = 0;
  //   const matrix = this.matrix;
  //   await this.loader.syncWrap(async () => {
  //     scrollPosition++;
  //     matrix
  //       .fgColor(widget.background || Colors.Black)
  //       .fill(0, widget.y || 10, matrix.width(), widget.height || 22);
  //     const glyphs = LayoutUtils.linesToMappedGlyphs(
  //       LayoutUtils.textToLines(font, this.matrix.width(), widget.text),
  //       font.height(),
  //       this.matrix.width(),
  //       this.matrix.height(),
  //       HorizontalAlignment.Left,
  //       VerticalAlignment.Top,
  //     );
  //     glyphs.forEach(({ x, y, char }) =>
  //       matrix.drawText(char, x + scrollPosition, y + (widget.y ?? EMPTY)),
  //     );
  //     await sleep(widget.speed || 50);
  //     return scrollPosition < totalLength;
  //   });
  // }

  protected onModuleInit(): void {
    FONT_LIST = readdirSync(this.root)
      .filter(i => i.endsWith(EXT))
      .map(i => i.replace(`.${EXT}`, "") as FONTS);
  }
}
