import { Injectable } from "@nestjs/common";
import { InjectConfig } from "@digital-alchemy/boilerplate";

import {
  PANEL_COLUMNS,
  PANEL_HEIGHT,
  PANEL_TOTAL,
  PANEL_WIDTH,
} from "../config";
import { LineService } from "../providers";

@Injectable()
export class BorderPulseService {
  constructor(
    private readonly line: LineService,
    @InjectConfig(PANEL_COLUMNS) private readonly columns: number,
    @InjectConfig(PANEL_HEIGHT) private readonly panelHeight: number,
    @InjectConfig(PANEL_WIDTH) private readonly panelWidth: number,
    @InjectConfig(PANEL_TOTAL) private readonly panelTotal: number,
  ) {
    this.totalWidth = this.panelWidth * this.columns;
    this.totalRows = Math.ceil(this.panelTotal / this.columns);
  }

  /**
   * Total vertical count of rows
   */
  private readonly totalRows: number;
  /**
   * Total pixel count in the X direction
   */
  private readonly totalWidth: number;
}
