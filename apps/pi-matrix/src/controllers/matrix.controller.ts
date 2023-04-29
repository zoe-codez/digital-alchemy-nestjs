import { MatrixService } from "@digital-alchemy/pi-matrix-client";
import {
  GenericWidgetDTO,
  MatrixDimensionsResponse,
  MatrixMathService,
} from "@digital-alchemy/rgb-matrix";
import { GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Body, Controller, Get, Post } from "@nestjs/common";
import { Color } from "rpi-led-matrix";

@Controller("/matrix")
export class MatrixController {
  constructor(
    private readonly matrix: MatrixService,
    private readonly math: MatrixMathService,
  ) {}

  @Get("/dimensions")
  public getDimensions(): MatrixDimensionsResponse {
    return {
      height: this.math.totalHeight,
      width: this.math.totalWidth,
    };
  }

  @Get("/widgets")
  public getWidget() {
    return this.matrix.widgets;
  }

  @Post("/grid")
  public setGrid(
    @Body() { grid }: { grid: Color[][] },
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.matrix.setGrid(grid);
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Post("/widgets")
  public setWidgets(
    @Body() body: { dash: GenericWidgetDTO[] },
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.matrix.setWidgets(body.dash);
    return GENERIC_SUCCESS_RESPONSE;
  }
}
