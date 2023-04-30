import {
  Colors,
  GenericWidgetDTO,
  MatrixDimensionsResponse,
  MatrixMathService,
  OFF,
  RGB,
} from "@digital-alchemy/rgb-matrix";
import { AuthStack, GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Body, Controller, Get, Post } from "@nestjs/common";
import { Color } from "rpi-led-matrix";

import { MatrixService } from "../services";

@Controller("/matrix")
@AuthStack()
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
  public pixelGrid(
    @Body() { grid, color }: { grid: string; color: Color },
  ): typeof GENERIC_SUCCESS_RESPONSE {
    const parsed = grid
      .split(`\n`)
      .map(i => [...i].map(index => index === "1"));
    this.matrix.setGrid(
      parsed.map(row =>
        row.map(cell => (cell ? color : { b: OFF, g: OFF, r: OFF })),
      ),
    );
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
