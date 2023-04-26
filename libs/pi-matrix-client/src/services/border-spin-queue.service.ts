import { AutoLogService, InjectConfig } from "@digital-alchemy/boilerplate";
import {
  BorderSpinQueue,
  BorderSpinQueueItem,
} from "@digital-alchemy/rgb-matrix";
import { forwardRef, Inject, Injectable } from "@nestjs/common";

import { BORDER_SPIN_LAYER_BOTTLENECK } from "../config";
import { SyncAnimationService } from "./sync-animation.service";

type RunningItem = {
  stop: () => void;
};

@Injectable()
export class BorderSpinQueueService {
  constructor(
    @Inject(forwardRef(() => SyncAnimationService))
    private readonly syncAnimation: SyncAnimationService,
    private readonly logger: AutoLogService,
    @InjectConfig(BORDER_SPIN_LAYER_BOTTLENECK)
    private readonly layerLimit: number,
  ) {}

  private QUEUE = [] as BorderSpinQueueItem[];
  private readonly RUNNING = new Map<number, RunningItem>();

  public async add(data: BorderSpinQueue): Promise<void> {
    data.type ??= "auto";
    data.completeMode ??= "leave";
    data.spins ??= [];

    switch (data.type) {
      case "replace":
        this.QUEUE = [];
        this.RUNNING.forEach((item, index) => {
          this.RUNNING.delete(index);
          item.stop();
        });
        this.tick();
        return;
      case "queue":
        //
        return;
      default:
        this.logger.error(`Unknown spin type: {${data.type}}`);
    }
  }

  private queue(options: BorderSpinQueue): void {
    //
  }

  private tick(): void {
    //
  }
}
