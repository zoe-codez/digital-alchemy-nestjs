import { InjectConfig } from "@digital-alchemy/boilerplate";
import { ARRAY_OFFSET } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

import {
  PANEL_COLUMNS,
  PANEL_HEIGHT,
  PANEL_TOTAL,
  PANEL_WIDTH,
} from "../config";

@Injectable()
export class MatrixMathService {
  constructor(
    @InjectConfig(PANEL_COLUMNS) public readonly columns: number,
    @InjectConfig(PANEL_HEIGHT) public readonly panelHeight: number,
    @InjectConfig(PANEL_WIDTH) public readonly panelWidth: number,
    @InjectConfig(PANEL_TOTAL) public readonly panelTotal: number,
  ) {
    this.bottomLeft = (this.columns - ARRAY_OFFSET) * this.panelHeight;
    this.totalWidth = this.panelWidth * this.columns;
    this.verticalPanelCount = Math.ceil(this.panelTotal / this.columns);
    this.totalHeight = this.verticalPanelCount * this.panelHeight;
  }

  /**
   * Refers to the panel index for the first panel of the last row
   */
  public readonly bottomLeft: number;
  /**
   * Total vertical count of rows
   */
  public readonly totalHeight: number;
  /**
   * Total pixel count in the X direction
   */
  public readonly totalWidth: number;
  /**
   * Total vertical count of rows
   */
  public readonly verticalPanelCount: number;

  public rolloverFix(
    x: number,
    y: number,
  ): [x: number, y: number, panelShift: number] {
    const panelShift = Math.floor(y / this.panelHeight);
    return [
      // ? push horizontally
      x + panelShift * this.totalWidth,
      // ? pull vertically
      y % this.panelHeight,
      panelShift,
    ];
  }
}
