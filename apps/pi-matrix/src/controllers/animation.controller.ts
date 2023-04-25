import {
  AnimationWidgetDTO,
  BorderSpinQueue,
  Colors,
  PulseLaserOptions,
} from "@digital-alchemy/rgb-matrix";
import { GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Body, Controller, Get, Post } from "@nestjs/common";
import { nextTick } from "process";

import { SyncAnimationService } from "../services";

@Controller("/animation")
export class AnimationController {
  constructor(private readonly animation: SyncAnimationService) {}

  @Post("/animate")
  public animate(
    @Body() body: AnimationWidgetDTO,
  ): typeof GENERIC_SUCCESS_RESPONSE {
    nextTick(async () => {
      await this.animation.runAnimation(body);
    });
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Post("/pulse-laser")
  public async pulseLaser(
    @Body() data: PulseLaserOptions,
  ): Promise<typeof GENERIC_SUCCESS_RESPONSE> {
    await this.animation.runAnimation({
      animationOptions: data,
      type: "animation",
    });
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Post("/spin-queue")
  public async spinQueue(
    @Body() data: BorderSpinQueue,
  ): Promise<typeof GENERIC_SUCCESS_RESPONSE> {
    await this.animation.spinQueue(data);
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Get("/test")
  public async test(): Promise<typeof GENERIC_SUCCESS_RESPONSE> {
    const BLUE = 0x5b_ce_fa;
    const PINK = 0xf5_a9_b8;
    const colors = [BLUE, PINK, Colors.White, PINK, BLUE];
    await this.animation.runAnimation({
      animationOptions: {
        beam: colors.flatMap(color => [color, color, color]),
        brightness: 70,
        row: 1,
        step1Color: Colors.Red,
        type: "pulse-laser",
        y: 10,
      },
      type: "animation",
    });

    return GENERIC_SUCCESS_RESPONSE;
  }
}
