import { SceneRoom } from "@digital-alchemy/automation-logic";
import { AutoLogService } from "@digital-alchemy/boilerplate";
import { iCallService, InjectCallProxy } from "@digital-alchemy/home-assistant";

import { LutronPicoSequenceMatcher, PicoIds } from "../includes";

const BedroomPico = LutronPicoSequenceMatcher(PicoIds.bedroom);

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
    @InjectCallProxy()
    private readonly call: iCallService,
  ) {}

  @BedroomPico(["off", "off"])
  protected async onDoubleTapOff() {
    this.logger.info(`Scene off via pico event`);
    await this.call.scene.turn_on({
      entity_id: "scene.bedroom_off",
    });
  }

  @BedroomPico(["stop", "raise", "raise"])
  protected onSuperSecretEvent(): void {
    this.logger.warn("Super secret combo code entered");
  }
}
