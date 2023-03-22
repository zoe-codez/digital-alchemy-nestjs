import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@digital-alchemy/boilerplate";
import {
  PushEntityConfigService,
  TemplateButton,
} from "@digital-alchemy/home-assistant";

@Injectable()
export class ExampleService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly config: PushEntityConfigService,
  ) {}

  protected async onPostInit() {
    await this.config.rebuild();
  }

  @TemplateButton("button.entity_creation_button")
  protected pushButtonTarget() {
    this.logger.info("[pushButtonTarget] HIT");
  }
}
