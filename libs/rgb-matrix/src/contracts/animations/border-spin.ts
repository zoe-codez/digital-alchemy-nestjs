import { IsDefined, IsNumber } from "class-validator";

import { ColorSetter } from "../render-widget.dto";

export class BorderSpinOptions {
  @IsNumber()
  public brightness?: number;
  @IsDefined()
  public colorA: ColorSetter;
  public colorB?: ColorSetter;
  @IsNumber()
  public interval?: number;
  public padding?: number;
  public type?: "border-spin";
}

export interface BorderSpinTickOptions {
  stop: () => void;
}

export type BorderSpinCallbackOptions = BorderSpinOptions & BorderSpinTickOptions;

export class BorderSpinQueueItem {
  /**
   * pause for ms while line is making full border
   *
   * @default 0
   */
  delayMidpoint?: number;
  /**
   * ms to delay before starting
   *
   * @default 0
   */
  delayStart?: number;
  options: BorderSpinOptions;
}

export class BorderSpinQueue {
  /**
   * > *Default*: "leave"
   *
   * ### Leave
   *
   * When spins with less padding compete, leave this one in place
   *
   * ### Collapse
   *
   * When spins of less padding complete, reduce the padding of this to push against outside
   */
  public completeMode?: "leave" | "collapse";

  public spins: BorderSpinQueueItem[];

  /**
   * > *Default*: "auto"
   *
   * ### Auto
   *
   * Insert spin at lowest available padding value.
   * Intended to work with "leave" `completeMode`.
   * Will not pick a value that is greater than `BORDER_SPIN_LAYER_BOTTLENECK` (config value)
   *
   * ### Replace
   *
   * Remove existing border spin animations (if present), run this one instead
   *
   * ### Outside
   *
   * Add 1 to the padding of all existing animations (if present), run this animation as the new outside spin
   *
   * ### Inside
   *
   * Set the padding of this border spin to make it the inside most one (if any are already present)
   *
   * ### Queue
   *
   * If any existing border spins are going wait for them to complete before running this one
   */
  public type?: "auto" | "replace" | "outside" | "inside" | "queue";
}
