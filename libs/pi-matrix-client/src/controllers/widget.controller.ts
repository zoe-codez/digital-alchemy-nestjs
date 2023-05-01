import { GenericWidgetDTO } from "@digital-alchemy/rgb-matrix";
import { AuthStack, GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Body, Controller, Get, Post } from "@nestjs/common";

import { TextService, WidgetService } from "../services";

@Controller("/widget")
@AuthStack()
export class WidgetController {
  constructor(
    private readonly widget: WidgetService,
    private readonly text: TextService,
  ) {}

  @Get("/")
  public getWidget() {
    return this.widget.widgets;
  }

  @Get("/fonts")
  public getLoadedFonts() {
    return TextService.FONT_LIST;
  }

  @Post("/")
  public setWidgets(
    @Body() body: { dash: GenericWidgetDTO[] },
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.widget.setWidgets(body.dash);
    return GENERIC_SUCCESS_RESPONSE;
  }
}
