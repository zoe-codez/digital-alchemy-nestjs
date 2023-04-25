import { GenericWidgetDTO } from "@digital-alchemy/rgb-matrix";
import { GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Body, Controller, Get, Post } from "@nestjs/common";

import { MatrixService } from "../services";

@Controller("/matrix")
export class MatrixController {
  constructor(private readonly matrix: MatrixService) {}

  @Get("/widgets")
  public getWidget() {
    return this.matrix.widgets;
  }

  @Post("/widgets")
  public setWidgets(
    @Body() body: { dash: GenericWidgetDTO[] },
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.matrix.setWidgets(body.dash);
    return GENERIC_SUCCESS_RESPONSE;
  }
}
