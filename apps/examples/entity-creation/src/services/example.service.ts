import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { PushEntityConfigService } from "@steggy/home-assistant";

@Injectable()
export class ExampleService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly config: PushEntityConfigService,
  ) {}

  protected async onPostInit() {
    await this.config.rebuild();
  }
}
