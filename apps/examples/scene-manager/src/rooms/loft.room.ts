import { OnSceneChange, SceneRoom } from "@steggy/automation-logic";
import { AutoLogService } from "@steggy/boilerplate";

@SceneRoom({
  name: "loft",
  scenes: {
    high: {},
    off: {},
  },
})
export class Loft {
  constructor(private readonly logger: AutoLogService) {}

  @OnSceneChange("loft")
  protected onLoftSceneChange() {
    this.logger.info("On loft scene change");
  }

  @OnSceneChange({ room: "loft", target_scene: "off" })
  protected onLoftTurnOff() {
    this.logger.info("On loft scene change => off");
  }
}
