import { MatrixMathService } from "@digital-alchemy/render-utils";
import { MatrixDimensionsResponse } from "@digital-alchemy/rgb-matrix";
import { AuthStack } from "@digital-alchemy/server";
import { Controller, Get } from "@nestjs/common";

import { RenderService } from "../services";

@Controller("/matrix")
@AuthStack()
export class MatrixController {
  constructor(
    private readonly matrix: RenderService,
    private readonly math: MatrixMathService,
  ) {}

  @Get("/dimensions")
  public getDimensions(): MatrixDimensionsResponse {
    return {
      height: this.math.totalHeight,
      width: this.math.totalWidth,
    };
  }
}
