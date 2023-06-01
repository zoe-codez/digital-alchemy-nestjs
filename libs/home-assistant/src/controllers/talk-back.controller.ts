import { AutoLogService } from "@digital-alchemy/boilerplate";
import { AuthStack, GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { TalkBackService } from "../services";
import { InputSelectOnSelect, PICK_GENERATED_ENTITY } from "../types";

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

  @Get("/button/:button")
  public onButtonPress(
    @Param("button") entity_id: PICK_GENERATED_ENTITY<"button">,
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.talkBack.onButtonTalkBack(entity_id);
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Post("/input_select/:key")
  public onInputSelectAction(
    @Param("key") key: PICK_GENERATED_ENTITY<"input_select">,
    @Body() body: InputSelectOnSelect,
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.talkBack.onInputSelectTalkBack(key, body);
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Get("/switch/:switch/:action")
  public onSwitchAction(
    @Param("switch") entity_id: PICK_GENERATED_ENTITY<"switch">,
    @Param("action") action: "on" | "off",
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.talkBack.onSwitchTalkBack(entity_id, action);
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Get("/load-verification/:id")
  public onVerifyServiceLoaded(): // @Param("id") id: string,
  typeof GENERIC_SUCCESS_RESPONSE {
    return GENERIC_SUCCESS_RESPONSE;
  }
}
