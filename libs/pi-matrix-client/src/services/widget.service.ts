import { AutoLogService } from "@digital-alchemy/boilerplate";
import {
  CircleWidgetDTO,
  ClockWidgetDTO,
  Colors,
  CountdownWidgetDTO,
  GenericWidgetDTO,
  HMS,
  ImageWidgetDTO,
  LineWidgetDTO,
  MAX_COLOR_BRIGHTNESS,
  RectangleWidgetDTO,
  TextWidgetDTO,
  UNLOAD_WIDGETS,
} from "@digital-alchemy/rgb-matrix";
import { eachSeries, EMPTY } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import dayjs from "dayjs";
import EventEmitter from "eventemitter3";
import {
  HorizontalAlignment,
  LayoutUtils,
  LedMatrixInstance,
  VerticalAlignment,
} from "rpi-led-matrix";

import { MATRIX_INSTANCE } from "../types";
import { ImageService } from "./image.service";
import { RenderService } from "./render.service";
import { SyncAnimationService } from "./sync-animation.service";
import { TextService } from "./text.service";

@Injectable()
export class WidgetService {
  constructor(
    @Inject(forwardRef(() => TextService))
    private readonly text: TextService,
    @Inject(forwardRef(() => ImageService))
    private readonly image: ImageService,
    private readonly logger: AutoLogService,
    @Inject(forwardRef(() => SyncAnimationService))
    private readonly syncAnimation: SyncAnimationService,
    private readonly event: EventEmitter,
    @Inject(MATRIX_INSTANCE)
    private readonly matrix: LedMatrixInstance,
    @Inject(forwardRef(() => RenderService))
    private readonly renderService: RenderService,
  ) {}

  /**
   * rendering widgets that are actively being maintained
   */
  public widgets: GenericWidgetDTO[] = [
    {
      font: "5x8",
      format: "hh:mm:ss",
      type: "clock",
    } as ClockWidgetDTO,
  ];

  /**
   * order of operations in rendering
   */
  private get prerender(): GenericWidgetDTO[] {
    const out = [];
    this.syncAnimation.pre.forEach(value => {
      out.push(...value);
    });
    return out;
  }

  /**
   * order of operations in rendering
   */
  private get postrender(): GenericWidgetDTO[] {
    const out = [];
    this.syncAnimation.post.forEach(value => {
      out.push(...value);
    });
    return out;
  }

  public initWidgets(widgets: GenericWidgetDTO[]): void {
    widgets.forEach((widget: GenericWidgetDTO) => {
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

  public async render(): Promise<void> {
    const list = [this.prerender, this.widgets, this.postrender].flat();
    try {
      this.matrix.clear();
      await eachSeries(list, async widget => await this.renderWidget(widget));
      this.matrix.sync();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  public renderWidget(widget: GenericWidgetDTO): void {
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

  public setWidgets(widgets: GenericWidgetDTO[]) {
    this.renderService.renderMode = "widget";
    this.event.emit(UNLOAD_WIDGETS);
    this.widgets = widgets;
    this.initWidgets(widgets);
  }

  private renderCircle({
    brightness = MAX_COLOR_BRIGHTNESS,
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
    brightness = MAX_COLOR_BRIGHTNESS,
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

  private renderRectangle({
    brightness = MAX_COLOR_BRIGHTNESS,
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
    brightness = MAX_COLOR_BRIGHTNESS,
    color = Colors.White,
    horizontal = HorizontalAlignment.Left,
    text,
    vertical = VerticalAlignment.Top,
    ...widget
  }: Partial<TextWidgetDTO>): void {
    const font = this.text.font(widget.font);
    if (!font) {
      this.logger.error(
        `Failed to load font to render. Asked for {%s}`,
        widget.font,
      );
      return;
    }
    const lines = LayoutUtils.textToLines(font, this.matrix.width(), text);
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
}
