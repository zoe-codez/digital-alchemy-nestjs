import { AutoLogService } from "@digital-alchemy/boilerplate";
import { MatrixMathService } from "@digital-alchemy/render-utils";
import { SetPixelGrid } from "@digital-alchemy/rgb-matrix";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { LedMatrixInstance } from "rpi-led-matrix";

import { MATRIX_INSTANCE } from "../types";
import { RenderService } from "./render.service";

const OFF = { b: 0, g: 0, r: 0 };

@Injectable()
export class PixelService {
  constructor(
    private readonly logger: AutoLogService,
    @Inject(MATRIX_INSTANCE)
    private readonly matrix: LedMatrixInstance,
    private readonly math: MatrixMathService,
    @Inject(forwardRef(() => RenderService))
    private readonly renderService: RenderService,
  ) {}

  public render() {
    //
  }

  public setGrid({ grid, palette, clear }: SetPixelGrid): void {
    this.renderService.renderMode = "pixel";
    if (clear !== false) {
      this.matrix.clear();
    }
    grid.forEach((row, ROW) =>
      row.forEach((color, COL) =>
        this.pixel(COL, ROW).fgColor(palette[color] ?? OFF),
      ),
    );
    this.matrix.sync();
  }

  /**
   * * `col` / `row` come in as a plain list of x/y coords
   *
   * These need to be translated to numbers that make sense for a chain of panels
   */
  private pixel(col: number, row: number): LedMatrixInstance {
    const [x, y] = this.math.rolloverFix(col, row);
    return this.matrix.setPixel(x, y);
  }
}
