import { Controller, Get, Param } from "@nestjs/common";
import { AuthStack, GENERIC_SUCCESS_RESPONSE } from "@steggy/server";

import { PushButtonService } from "../services";
import { PICK_GENERATED_ENTITY } from "../types";

@Controller("/talk-back")
@AuthStack()
export class TalkBackController {
  constructor(private readonly button: PushButtonService) {}

  @Get("/button-press/:button")
  public onButtonPress(
    @Param("button") entity_id: PICK_GENERATED_ENTITY<"button">,
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.button.announce(entity_id);
    return GENERIC_SUCCESS_RESPONSE;
  }
}
