import { SceneRoom } from "@digital-alchemy/automation-logic";
import { AutoLogService } from "@digital-alchemy/boilerplate";
import { OnEntityUpdate } from "@digital-alchemy/home-assistant";

@SceneRoom({
  name: "loft",
  scenes: {
    high: {},
    off: {},
  },
})
export class Loft {
  constructor(private readonly logger: AutoLogService) {}

  @OnEntityUpdate("scene.loft_current_scene")
  protected onLoftSceneChange() {
    this.logger.info("On loft scene change");
  }
}
