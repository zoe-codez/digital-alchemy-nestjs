import { OnSceneChange, SceneRoom } from "@digital-alchemy/automation-logic";
import { AutoLogService } from "@digital-alchemy/boilerplate";

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
