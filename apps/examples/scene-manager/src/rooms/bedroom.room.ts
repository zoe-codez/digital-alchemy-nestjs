import { SceneRoom } from "@steggy/automation-logic";
import { AutoLogService } from "@steggy/boilerplate";
import {
  PushEntityConfigService,
  TemplateButton,
} from "@steggy/home-assistant";

@SceneRoom({
  name: "bedroom",
  scenes: {
    dimmed: {
      "light.bedroom_fan": { brightness: 75, state: "on" },
      "switch.bedroom_lamp": { state: "on" },
    },
    high: {
      "light.bedroom_fan": { brightness: 255, state: "on" },
      "switch.bedroom_lamp": { state: "on" },
    },
    off: {
      "light.bedroom_fan": { state: "off" },
      "switch.bedroom_lamp": { state: "off" },
    },
  },
})
export class Bedroom {
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
