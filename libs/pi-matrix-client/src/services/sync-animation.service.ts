import { AutoLogService } from "@digital-alchemy/boilerplate";
import {
  AnimatedBorderCallback,
  AnimationService,
  AnimationWidgetDTO,
  BorderSpinQueue,
  GenericWidgetDTO,
} from "@digital-alchemy/rgb-matrix";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { v4 } from "uuid";

import { BorderSpinQueueService } from "./border-spin-queue.service";
import { CountdownService } from "./countdown.service";
import { MatrixService } from "./matrix.service";

@Injectable()
export class SyncAnimationService {
  constructor(
    @Inject(forwardRef(() => CountdownService))
    private readonly countdown: CountdownService,
    @Inject(forwardRef(() => MatrixService))
    private readonly matrix: MatrixService,
    @Inject(forwardRef(() => BorderSpinQueueService))
    private readonly borderSpinQueue: BorderSpinQueueService,
    private readonly animation: AnimationService,
    private readonly logger: AutoLogService,
  ) {}

  public readonly post = new Map<string, GenericWidgetDTO[]>();
  public readonly pre = new Map<string, GenericWidgetDTO[]>();

  public async runAnimation({
    order = "post",
    ...animation
  }: AnimationWidgetDTO): Promise<void> {
    const id = v4();
    const callback: AnimatedBorderCallback = lines => {
      const map = order === "pre" ? this.pre : this.post;
      map.set(id, lines);
      this.matrix.render();
    };
    if (animation.mqttStart) {
      this.logger.error(
        `[%s] cannot publish {%s}`,
        animation.mqttStart,
        "mqttStart",
      );
    }
    switch (animation.animationOptions.type) {
      case "border-spin":
        await this.animation.borderSpin({
          ...animation.animationOptions,
          callback,
        });
        break;
      case "countdown":
        await this.countdown.exec({
          ...animation.animationOptions,
          callback,
        });
        break;
      case "pulse-laser":
        await this.animation.pulseLaser({
          ...animation.animationOptions,
          callback,
        });
        break;
    }
    this.pre.delete(id);
    this.post.delete(id);
    this.matrix.render();
    if (animation.mqttEnd) {
      this.logger.error(
        `[%s] cannot publish {%s}`,
        animation.mqttEnd,
        "mqttEnd",
      );
      // this.mqtt.publish(animation.mqttEnd, id);
    }
  }

  public async spinQueue(data: BorderSpinQueue): Promise<void> {
    await this.borderSpinQueue.add(data);
  }
}
