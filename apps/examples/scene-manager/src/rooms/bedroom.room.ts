import { SceneRoom, SceneRoomService } from "@steggy/automation-logic";
import { AutoLogService } from "@steggy/boilerplate";

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
    private readonly scene: SceneRoomService<"bedroom">,
  ) {}

  @BedroomPico(["off", "off"])
  protected onDoubleTapOff(): void {
    this.logger.info(`Scene off via pico event`);
    this.scene.set("off");
  }

  @BedroomPico(["stop", "raise", "raise"])
  protected onSuperSecretEvent(): void {
    this.logger.warn("Super secret combo code entered");
  }
}
