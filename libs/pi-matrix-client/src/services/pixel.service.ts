import { AutoLogService } from "@digital-alchemy/boilerplate";
import { MatrixMathService } from "@digital-alchemy/rgb-matrix";
import { is } from "@digital-alchemy/utilities";
import { Inject, Injectable } from "@nestjs/common";
import { Color, LedMatrixInstance } from "rpi-led-matrix";

import { MATRIX_INSTANCE } from "../types";
import { RenderService } from "./render.service";

@Injectable()
export class PixelService {
  constructor(
    private readonly logger: AutoLogService,
    @Inject(MATRIX_INSTANCE)
    private readonly matrix: LedMatrixInstance,
    private readonly math: MatrixMathService,
    private readonly renderService: RenderService,
  ) {}

  public render() {
    //
  }

  public setGrid(grid: Color[][]): void {
    this.renderService.renderMode = "pixel";

    this.matrix.clear();
    this.logger.info(`Received {%s} rows of pixels`, grid.length);
    grid.forEach((row, ROW) =>
      row.forEach((color, COL) => {
        if (ROW > 30) {
          return;
        }
        const [x, y, panelShift] = this.math.rolloverFix(COL, ROW);
        this.logger.debug({
          COL,
          ROW,
          panelShift,
          x,
          y,
        });
        this.matrix.setPixel(x, y).fgColor(
          x > 300
            ? color
            : is.random([
                { b: 0, g: 0, r: 0 },
                { b: 75, g: 100, r: 50 },
              ]),
        );
      }),
    );
    this.matrix.sync();
  }
}
