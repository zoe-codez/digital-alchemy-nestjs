import { InjectConfig } from "@digital-alchemy/boilerplate";
import {
  ARRAY_OFFSET,
  NONE,
  SINGLE,
  sleep,
  START,
} from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

import {
  PANEL_COLUMNS,
  PANEL_HEIGHT,
  PANEL_TOTAL,
  PANEL_WIDTH,
} from "../config";
import { LineService } from "../providers";
import {
  AnimatedBorderCallback,
  BorderSpinOptions,
  ColorSetter,
  LineWidgetDTO,
} from "../types";

const DEFAULT_BORDER_INTERVAL = 10;
const DEFAULT_BORDER_BRIGHTNESS = 50;
const BOTH_SIDES = 2;

type LineOptions = {
  brightness: number;
  color: ColorSetter;
  diff: number;
  padding: number;
  time: number;
  totalHeight: number;
  totalWidth: number;
};

@Injectable()
export class BorderSpinService {
  constructor(
    private readonly line: LineService,
    @InjectConfig(PANEL_COLUMNS) private readonly columns: number,
    @InjectConfig(PANEL_HEIGHT) private readonly panelHeight: number,
    @InjectConfig(PANEL_WIDTH) private readonly panelWidth: number,
    @InjectConfig(PANEL_TOTAL) private readonly panelTotal: number,
  ) {
    this.bottomLeft = (this.columns - ARRAY_OFFSET) * this.panelHeight;
    this.totalWidth = this.panelWidth * this.columns;
    this.totalRows = Math.ceil(this.panelTotal / this.columns);
  }

  /**
   * Refers to the panel index for the first panel of the last row
   */
  private readonly bottomLeft: number;
  /**
   * Total vertical count of rows
   */
  private readonly totalRows: number;
  /**
   * Total pixel count in the X direction
   */
  private readonly totalWidth: number;

  /**
   * Extend a line from the top/left + bottom/right, then retract
   */
  public async exec({
    brightness = DEFAULT_BORDER_BRIGHTNESS,
    callback,
    colorA,
    colorB,
    interval = DEFAULT_BORDER_INTERVAL,
    padding = NONE,
  }: BorderSpinOptions & { callback: AnimatedBorderCallback }) {
    let color = colorA;
    const bothSidesPadding = padding * BOTH_SIDES;
    const totalHeight =
      this.panelHeight * (this.panelTotal / this.columns) - bothSidesPadding;
    const totalWidth = this.panelWidth * this.columns - bothSidesPadding;
    const diff = totalWidth / totalHeight;
    // ! Extend
    for (let time = START; time <= totalHeight; time++) {
      callback([
        this.growTopLeftRight({ brightness, color, diff, padding, time }),
        this.growBottomRightLeft({ brightness, color, diff, padding, time }),
        ...this.growLeftBottomUp({
          brightness,
          color,
          padding,
          time,
          totalHeight,
        }),
        ...this.growRightTopDown({
          brightness,
          color,
          padding,
          time,
          totalHeight,
        }),
      ]);
      await sleep(interval);
    }
    color = colorB ?? colorA;
    // ! Retract
    for (let time = START; time < totalHeight; time++) {
      callback([
        this.shrinkTopLeftRight({ brightness, color, diff, padding, time }),
        this.shrinkBottomRightLeft({
          brightness,
          color,
          diff,
          padding,
          time,
          totalHeight,
        }),
        ...this.shrinkLeftBottomUp({
          brightness,
          color,
          padding,
          time,
          totalHeight,
        }),
        ...this.shrinkRightTopDown({
          brightness,
          color,
          padding,
          time,
          totalHeight,
          totalWidth,
        }),
      ]);
      await sleep(interval);
    }
    callback([]);
  }

  private growBottomRightLeft({
    time,
    padding,
    diff,
    brightness,
    color,
  }: Omit<LineOptions, "totalHeight" | "totalWidth">) {
    const shift = this.totalRows * this.totalWidth;
    const min = shift + padding - this.totalWidth;
    const left = shift - padding - Math.ceil(time * diff);
    const out = {
      brightness,
      color,
      // right
      endX: shift - padding - ARRAY_OFFSET,
      endY: this.panelHeight - SINGLE - padding,
      type: "line",
      // left
      x: left < min ? min : left,
      y: this.panelHeight - SINGLE - padding,
    } as LineWidgetDTO;
    return out;
  }

  private growLeftBottomUp({
    time,
    padding,
    totalHeight,
    brightness,
    color,
  }: Omit<LineOptions, "diff" | "totalWidth">) {
    return this.line
      .bottomToTop(padding, Math.min(time, totalHeight), padding)
      .map(i => ({ ...i, brightness, color, type: "line" } as LineWidgetDTO));
  }

  private growRightTopDown({
    time,
    padding,
    brightness,
    totalHeight,
    color,
  }: Omit<LineOptions, "diff" | "totalWidth">) {
    return this.line
      .topToBottom(
        // ARRAY_OFFSET because grid is 0 indexed, and we need flush
        this.totalWidth - ARRAY_OFFSET - padding,
        Math.min(time, totalHeight),
        padding,
      )
      .map(i => ({ ...i, brightness, color, type: "line" } as LineWidgetDTO));
  }

  private growTopLeftRight({
    time,
    padding,
    diff,
    brightness,
    color,
  }: Omit<LineOptions, "totalHeight" | "offset" | "totalWidth">) {
    return {
      brightness,
      color,
      endX: Math.max(padding, Math.ceil(time * diff) + padding - ARRAY_OFFSET),
      endY: padding,
      type: "line",
      x: padding,
      y: padding,
    } as LineWidgetDTO;
  }

  private shrinkBottomRightLeft({
    time,
    padding,
    diff,
    brightness,
    color,
  }: Omit<LineOptions, "offset" | "totalWidth">) {
    const shift = this.totalRows * this.totalWidth;
    const right = shift - Math.ceil(time * diff) - padding;
    const out = {
      brightness,
      color,
      // right
      endX: right,
      endY: this.panelHeight - SINGLE - padding,
      type: "line",
      // left
      x: shift - this.totalWidth + padding,
      y: this.panelHeight - SINGLE - padding,
    } as LineWidgetDTO;
    return out;
  }

  private shrinkLeftBottomUp({
    time,
    padding,
    totalHeight,
    brightness,
    color,
  }: Omit<LineOptions, "diff" | "offset" | "totalWidth">) {
    return this.line
      .topToBottom(padding, totalHeight - time, padding)
      .map(i => ({ ...i, brightness, color, type: "line" } as LineWidgetDTO));
  }

  private shrinkRightTopDown({
    time,
    padding,
    brightness,
    color,
  }: Omit<LineOptions, "diff" | "offset">) {
    return this.line
      .bottomToTop(
        //
        this.totalWidth - padding - ARRAY_OFFSET,
        this.totalRows * this.panelHeight - time,
        padding,
      )
      .map(i => ({ ...i, brightness, color, type: "line" } as LineWidgetDTO));
  }

  private shrinkTopLeftRight({
    time,
    padding,
    diff,
    brightness,
    color,
  }: Omit<LineOptions, "totalHeight" | "offset" | "totalWidth">) {
    return {
      brightness,
      color,
      // left
      endX: Math.floor(time * diff) + padding,
      endY: START + padding,
      type: "line",
      // right
      x: this.totalWidth * (this.columns - SINGLE) - padding - ARRAY_OFFSET,
      y: START + padding,
    } as LineWidgetDTO;
  }
}
