/* eslint-disable @typescript-eslint/no-magic-numbers */
import { AutoLogService, InjectConfig } from "@digital-alchemy/boilerplate";
import { ARRAY_OFFSET, NONE } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

import {
  PANEL_COLUMNS,
  PANEL_HEIGHT,
  PANEL_TOTAL,
  PANEL_WIDTH,
} from "../config";
import { LineWidgetDTO } from "../contracts";

type LinePartial = Pick<LineWidgetDTO, "x" | "endX" | "y" | "endY">;

/**
 * Multi-panel lines
 */
@Injectable()
export class LineService {
  constructor(
    @InjectConfig(PANEL_COLUMNS) private readonly columns: number,
    @InjectConfig(PANEL_HEIGHT) private readonly panelHeight: number,
    @InjectConfig(PANEL_WIDTH) private readonly panelWidth: number,
    @InjectConfig(PANEL_TOTAL) private readonly panelTotal: number,
    private readonly logger: AutoLogService,
  ) {
    this.totalWidth = this.panelWidth * this.columns;
    this.totalRows = Math.ceil(this.panelTotal / this.columns);
    this.bottom = this.totalRows * this.panelHeight;
  }

  private readonly bottom: number;
  private readonly totalRows: number;
  private readonly totalWidth: number;

  public bottomToTop(
    left: number,
    height: number,
    offset = NONE,
  ): LinePartial[] {
    const top = this.bottom - offset - height;
    const bottom = this.bottom - offset;
    return this.multiPanelVerticalLine(left, top, bottom);
  }

  public topToBottom(
    left: number,
    height: number,
    offset = NONE,
  ): LinePartial[] {
    const top = offset;
    const bottom = offset + height;
    return this.multiPanelVerticalLine(left, top, bottom);
  }

  private getHeight(start: number, end: number, localY: number): number {
    const distance = Math.abs(start - end);
    const available = this.panelHeight - localY;
    return Math.min(available, distance);
  }

  /**
   * Stitch together a vertical line going across multiple panels in a grid
   */
  private multiPanelVerticalLine(
    x: number,
    yTop: number,
    yBottom: number,
  ): LinePartial[] {
    if (yTop > yBottom) {
      return this.multiPanelVerticalLine(x, yBottom, yTop);
    }
    const out = [];
    while (yTop < yBottom) {
      const start = Math.floor(yTop / this.panelHeight);
      const localX = start * this.totalWidth;
      const y = yTop % this.panelHeight;
      const height = this.getHeight(yTop, yBottom, y);
      out.push({
        endX: localX + x,
        endY: y + height - ARRAY_OFFSET,
        x: localX + x,
        y,
      });
      yTop += height;
    }
    return out;
  }
}
