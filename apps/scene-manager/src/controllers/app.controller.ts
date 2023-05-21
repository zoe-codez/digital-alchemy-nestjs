import { AutoLogService } from "@digital-alchemy/boilerplate";
import { AuthStack, GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Controller, Get } from "@nestjs/common";

@Controller("/app")
@AuthStack()
export class AppController {
  constructor(private readonly logger: AutoLogService) {}

  @Get("/custom-rest")
  public customLogTarget() {
    this.logger.info(`[custom-rest-logger] hit!`);
    return GENERIC_SUCCESS_RESPONSE;
  }
}
