import { AutoLogService } from "@digital-alchemy/boilerplate";
import { AuthStack, GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Controller, Get, Param } from "@nestjs/common";

import { TalkBackService } from "../services";
import { PICK_GENERATED_ENTITY } from "../types";

/**
 * Note: URL segments must be matched against `talk-back.service`
 */
@Controller("/talk-back")
@AuthStack()
export class TalkBackController {
  constructor(
    private readonly logger: AutoLogService,
    private readonly talkBack: TalkBackService,
  ) {}

  @Get("/button-press/:button")
  public onButtonPress(
    @Param("button") entity_id: PICK_GENERATED_ENTITY<"button">,
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.talkBack.onButtonTalkBack(entity_id);
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Get("/switch-action/:switch/:action")
  public onSwitchAction(
    @Param("switch") entity_id: PICK_GENERATED_ENTITY<"switch">,
    @Param("action") action: "turn_on" | "turn_off",
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.talkBack.onSwitchTalkBack(entity_id, action);
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Get("/load-verification/:id")
  public onVerifyServiceLoaded(
    @Param("id") id: string,
  ): typeof GENERIC_SUCCESS_RESPONSE {
    return GENERIC_SUCCESS_RESPONSE;
  }
}
