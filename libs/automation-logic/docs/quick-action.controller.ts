import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  QuickActionListItem,
  QuickActionService,
} from "@steggy/automation-logic";
import { GENERIC_SUCCESS_RESPONSE } from "@steggy/server";

@Controller("/quick-action")
export class QuickActionController {
  constructor(private readonly quickAction: QuickActionService) {}

  @Post(`/exec/:id`)
  public async call(
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<typeof GENERIC_SUCCESS_RESPONSE> {
    await this.quickAction.call(id, body);
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Get("/")
  public list(): QuickActionListItem[] {
    return this.quickAction.list;
  }
}
