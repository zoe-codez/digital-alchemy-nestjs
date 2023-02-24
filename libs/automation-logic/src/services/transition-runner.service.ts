import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { domain, PICK_ENTITY } from "@steggy/home-assistant";
import { DEFAULT_LIMIT, each, is } from "@steggy/utilities";
import dayjs from "dayjs";

import { CannedTransitions, LightTransition, OFF, tScene } from "../types";
import { GradualDimService } from "./gradual-dim.service";

@Injectable()
export class TransitionRunnerService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly dimmer: GradualDimService,
  ) {}

  public async run(
    operations: CannedTransitions[],
    scene: tScene,
    stop: () => void,
  ): Promise<void> {
    if (!Array.isArray(operations)) {
      this.logger.error(
        { operations },
        `Invalid operations list (must be array)`,
      );
      return;
    }
    await each(operations, async transition => {
      if (transition.type === "light:gradual") {
        await this.runLightGradual(transition, scene, stop);
        return;
      }
      this.logger.error({ transition }, `Unknown transition type`);
    });
  }

  private async runLightGradual(
    transition: LightTransition,
    scene: tScene,
    stop: () => void,
  ): Promise<void> {
    // List should be the explicit entity (if passed), or list of all lights
    const list = is.empty(transition.entity)
      ? Object.keys(scene).filter((id: PICK_ENTITY) => domain(id) === "light")
      : [transition.entity];

    await each(list, async (entity_id: PICK_ENTITY<"light">) => {
      const target =
        scene[entity_id].state === "off" ? OFF : scene[entity_id].brightness;
      if (!is.number(target)) {
        this.logger.error(
          { scene, transition },
          `[${entity_id}] cannot identify brightness target to transition to in scene`,
        );
        return;
      }
      const end = dayjs().add(transition.duration ?? DEFAULT_LIMIT, "second");
      await this.dimmer.run({ end, entity_id, stop, target });
    });
  }
}
