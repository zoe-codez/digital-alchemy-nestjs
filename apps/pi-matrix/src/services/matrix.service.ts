/* eslint-disable sonarjs/no-identical-functions */
import { AutoLogService, InjectConfig } from "@digital-alchemy/boilerplate";
import {
  CircleWidgetDTO,
  ClockWidgetDTO,
  Colors,
  CountdownWidgetDTO,
  DEFAULT_FONT,
  FONTS,
  GenericWidgetDTO,
  HMS,
  ImageWidgetDTO,
  LIB_RGB_MATRIX,
  LineWidgetDTO,
  RectangleWidgetDTO,
  TextWidgetDTO,
  UNLOAD_WIDGETS,
} from "@digital-alchemy/rgb-matrix";
import { eachSeries, EMPTY } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { isNumberString } from "class-validator";
import dayjs from "dayjs";
import EventEmitter from "eventemitter3";
import { nextTick } from "process";
import {
  Color,
  HorizontalAlignment,
  LayoutUtils,
  LedMatrix,
  LedMatrixInstance,
  MatrixOptions,
  RuntimeOptions,
  VerticalAlignment,
} from "rpi-led-matrix";

import { MATRIX_OPTIONS, RUNTIME_OPTIONS, UPDATE_INTERVAL } from "../config";
import { ImageService } from "./image.service";
import { SyncAnimationService } from "./sync-animation.service";
import { TextService } from "./text.service";

const MAX_BRIGHTNESS = 255;
export const AFTER_SYNC = "after-sync";
export type tAfterSync = (arguments_: {
  dt: number;
  t: number;
}) => boolean | Promise<boolean>;

@Injectable()
export class MatrixService {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig(UPDATE_INTERVAL)
    private readonly updateInterval: number,
    @InjectConfig(MATRIX_OPTIONS, LIB_RGB_MATRIX)
    private readonly matrixOptions: MatrixOptions,
    @InjectConfig(RUNTIME_OPTIONS)
    private readonly runtimeOptions: RuntimeOptions,
    @InjectConfig(DEFAULT_FONT, LIB_RGB_MATRIX)
    private readonly defaultFont: FONTS,
    @Inject(forwardRef(() => TextService))
    private readonly text: TextService,
    @Inject(forwardRef(() => ImageService))
    private readonly image: ImageService,
    private readonly event: EventEmitter,
    @Inject(forwardRef(() => SyncAnimationService))
    private readonly syncAnimation: SyncAnimationService,
  ) {}

  public lastRender: {
    dt: number;
    t: number;
  };
  public matrix: LedMatrixInstance;
  public widgets: GenericWidgetDTO[] = [
    {
      font: "5x8",
      format: "hh:mm:ss",
      type: "clock",
    } as ClockWidgetDTO,
  ];
  private isRendering = false;
  private paused = false;
  private get prerender(): GenericWidgetDTO[] {
    const out = [];
    this.syncAnimation.pre.forEach(value => {
      out.push(...value);
    });
    return out;
  }
  private get postrender(): GenericWidgetDTO[] {
    const out = [];
    this.syncAnimation.post.forEach(value => {
      out.push(...value);
    });
    return out;
  }
  private renderImmediate = false;
  private stash: GenericWidgetDTO[][] = [];

  public async render(): Promise<void> {
    if (this.paused) {
      this.logger.debug("paused");
      return;
    }
    if (this.isRendering) {
      this.renderImmediate = true;
      return;
    }
    this.isRendering = true;
    const list = [
      //
      ...this.prerender,
      ...this.widgets,
      ...this.postrender,
    ];
    try {
      this.matrix.clear();
      await eachSeries(list, async widget => await this.renderWidget(widget));
      this.matrix.sync();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  // ? Mental note: There is no way to look up current colors
  // Would require the use of a render buffer
  public setGrid(grid: Color[][]): void {
    grid.forEach((row, rowIndex) =>
      row.forEach((cell, colIndex) =>
        this.matrix.setPixel(colIndex, rowIndex).fgColor(cell),
      ),
    );
    this.matrix.sync();
  }

  public setWidgets(widgets: GenericWidgetDTO[]) {
    this.event.emit(UNLOAD_WIDGETS);
    this.widgets = widgets;
    this.widgets.forEach((widget: GenericWidgetDTO) => {
      if (["clock", "text", "countdown"].includes(widget.type)) {
        this.text.load((widget as TextWidgetDTO).font);
        return;
      }
      if (["image"].includes(widget.type)) {
        const w = widget as ImageWidgetDTO;
        this.image.loadImage(w.path, w);
        return;
      }
      if (["gif"].includes(widget.type)) {
        const w = widget as ImageWidgetDTO;
        this.image.loadAnimation(w);
        return;
      }
      if (["rectangle", "line", "circle"].includes(widget.type)) {
        return;
      }
      this.logger.warn(`Unknown widget type: {${widget.type}}`);
    });
  }

  public start(): void {
    this.widgets = this.stash.pop();
    this.paused = false;
  }

  public stop(): void {
    this.stash.push(this.widgets);
    this.paused = true;
  }

  protected onModuleInit(): void {
    const matrix = Object.fromEntries(
      Object.entries(this.matrixOptions).map(([name, value]) => [
        name,
        isNumberString(value) ? Number(value) : value,
      ]),
    );
    const runtime = Object.fromEntries(
      Object.entries(this.runtimeOptions).map(([name, value]) => [
        name,
        isNumberString(value) ? Number(value) : value,
      ]),
    );
    this.logger.info({ matrix: matrix, runtime: runtime }, `new [LedMatrix]`);
    this.matrix = new LedMatrix(
      { ...LedMatrix.defaultMatrixOptions(), ...matrix },
      { ...LedMatrix.defaultRuntimeOptions(), ...runtime },
    );
    this.text.load("5x8");
    this.renderLoop();
  }

  private renderCircle({
    brightness = MAX_BRIGHTNESS,
    color = Colors.White,
    r = EMPTY,
    x = EMPTY,
    y = EMPTY,
  }: CircleWidgetDTO): void {
    this.matrix.fgColor(color).brightness(brightness).drawCircle(x, y, r);
  }

  private renderCountdown({
    overflow = false,
    prefix = "",
    suffix = "",
    ...widget
  }: CountdownWidgetDTO & { end?: number }): void {
    widget.end ??= dayjs(widget.target).toDate().getTime();
    const now = Date.now();
    const diff =
      !overflow && widget.end < now ? EMPTY : Math.abs(widget.end - now);
    this.renderText({
      ...(widget as CountdownWidgetDTO),
      text: `${prefix}${HMS(diff)}${suffix}`,
    });
  }

  private renderLine({
    brightness = MAX_BRIGHTNESS,
    color = Colors.White,
    endX = EMPTY,
    endY = EMPTY,
    x = EMPTY,
    y = EMPTY,
  }: LineWidgetDTO): void {
    this.matrix
      .fgColor(color)
      .brightness(brightness)
      .drawLine(Number(x), Number(y), Number(endX), Number(endY));
  }

  private renderLoop(): void {
    // This method cannot be async
    // matrix library will go 100% CPU and break everything
    this.matrix.afterSync((matrix, dt, t) => {
      this.lastRender = { dt, t };
      this.isRendering = false;
      if (this.renderImmediate) {
        this.renderImmediate = false;
        nextTick(() => this.render());
      }
    });
    setInterval(async () => {
      await this.render();
    }, this.updateInterval);
  }

  private renderRectangle({
    brightness = MAX_BRIGHTNESS,
    color = Colors.White,
    fill = "none",
    height,
    width,
    x = EMPTY,
    y = EMPTY,
  }: RectangleWidgetDTO): void {
    this.matrix.fgColor(color).brightness(brightness);
    if (fill === "solid") {
      // ? Keeping the interface consistent
      this.matrix.fill(x, y, x + width, y + height);
      return;
    }
    this.matrix.drawRect(x, y, width, height);
  }

  private renderText({
    brightness = MAX_BRIGHTNESS,
    color = Colors.White,
    horizontal = HorizontalAlignment.Left,
    text,
    vertical = VerticalAlignment.Top,
    ...widget
  }: Partial<TextWidgetDTO>): void {
    const font = this.text.fonts.get(widget.font ?? this.defaultFont);
    const lines = LayoutUtils.textToLines(font, this.matrix.width(), text);
    // lines[0]
    const glyphs = LayoutUtils.linesToMappedGlyphs(
      lines,
      font.height(),
      this.matrix.width(),
      this.matrix.height(),
      horizontal,
      vertical,
    );
    this.matrix.font(font).fgColor(color).brightness(brightness);
    glyphs.forEach(({ x, y, char }) =>
      this.matrix.drawText(
        char,
        x + (widget.x ?? EMPTY),
        y + (widget.y ?? EMPTY),
      ),
    );
  }

  private renderWidget(widget: GenericWidgetDTO): void {
    switch (widget.type) {
      case "image": {
        const i = widget as ImageWidgetDTO;
        this.image.render(i.path, i);
        return;
      }
      case "countdown": {
        this.renderCountdown(widget as CountdownWidgetDTO);
        return;
      }
      case "clock": {
        this.renderText({
          ...(widget as ClockWidgetDTO),
          text: dayjs().format((widget as ClockWidgetDTO).format ?? "hh:mm:ss"),
        });
        return;
      }
      case "text": {
        this.renderText(widget as TextWidgetDTO);
        return;
      }
      case "line": {
        this.renderLine(widget as LineWidgetDTO);
        return;
      }
      case "rectangle": {
        this.renderRectangle(widget as RectangleWidgetDTO);
        return;
      }
      case "circle": {
        this.renderCircle(widget as CircleWidgetDTO);
        return;
      }
    }
  }
}
