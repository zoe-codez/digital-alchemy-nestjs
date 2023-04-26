import { forwardRef, Inject, Injectable } from "@nestjs/common";

import { BorderSpinService, PulseLaserService } from "../animations";
import {
  AnimatedBorderCallback,
  BorderSpinOptions,
  PulseLaserOptions,
} from "../types";

type callback<T> = T & { callback: AnimatedBorderCallback };

@Injectable()
export class AnimationService {
  constructor(
    @Inject(forwardRef(() => BorderSpinService))
    private readonly borderSpinService: BorderSpinService,
    @Inject(forwardRef(() => PulseLaserService))
    private readonly pulseLaserService: PulseLaserService,
  ) {}

  /**
   * Extend a line from the top/left + bottom/right, then retract
   */
  public async borderSpin(options: callback<BorderSpinOptions>): Promise<void> {
    return await this.borderSpinService.exec(options);
  }

  /**
   * Blast rows of pixels out of existence
   */
  public async pulseLaser(options: callback<PulseLaserOptions>): Promise<void> {
    return await this.pulseLaserService.exec(options);
  }
}
