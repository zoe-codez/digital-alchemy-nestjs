import { ColorSetter } from "../render-widget.dto";

export interface PulseLaserOptions {
  /**
   * One color for each vertical line
   */
  beam: ColorSetter[];
  brightness: number;
  /**
   * Vertical panel row
   */
  row: number;
  step1Color: ColorSetter;
  type: "pulse-laser";
  /**
   * Top most position of the beam
   */
  y: number;
}
