import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import {
  PushEntityConfigService,
  TemplateButton,
} from "@steggy/home-assistant";

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
