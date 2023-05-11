/* eslint-disable @typescript-eslint/no-magic-numbers */
import { AutoLogService } from "@digital-alchemy/boilerplate";
import { MatrixMathService } from "@digital-alchemy/render-utils";
import { ARRAY_OFFSET, NONE } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

import { LineWidgetDTO } from "../types";

type LinePartial = Pick<LineWidgetDTO, "x" | "endX" | "y" | "endY">;

/**
 * Multi-panel lines
 */
@Injectable()
export class LineService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly math: MatrixMathService,
  ) {}

  public bottomToTop(
    left: number,
    height: number,
    offset = NONE,
  ): LinePartial[] {
    const top = this.math.bottom - offset - height;
    const bottom = this.math.bottom - offset;
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
    const available = this.math.panelHeight - localY;
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
      const start = Math.floor(yTop / this.math.panelHeight);
      const localX = start * this.math.totalWidth;
      const y = yTop % this.math.panelHeight;
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
