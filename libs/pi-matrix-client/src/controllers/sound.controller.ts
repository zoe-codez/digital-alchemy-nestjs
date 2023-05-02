import { AuthStack } from "@digital-alchemy/server";
import { Controller, Get } from "@nestjs/common";

import { SoundService, TextService } from "../services";

@Controller("/sound")
@AuthStack()
export class SoundController {
  constructor(private readonly sound: SoundService) {}

  @Get("/")
  public soundFileList() {
    return this.sound.soundFileList();
  }

  @Get("/devices")
  public speakerDeviceList() {
    return TextService.FONT_LIST;
  }

  // @Post("/")
  // public setWidgets(
  //   @Body() body: { dash: GenericWidgetDTO[] },
  // ): typeof GENERIC_SUCCESS_RESPONSE {
  //   this.widget.setWidgets(body.dash);
  //   return GENERIC_SUCCESS_RESPONSE;
  // }
}
