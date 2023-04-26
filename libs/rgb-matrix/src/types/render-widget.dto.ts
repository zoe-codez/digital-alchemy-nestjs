import { HorizontalAlignment, VerticalAlignment } from "rpi-led-matrix";

import {
  BorderSpinOptions,
  CountdownOptions,
  PulseLaserOptions,
} from "./animations";
import { Colors } from "./colors";
import { FONTS } from "./fonts";

export type AnimatedBorderCallback<
  T extends GenericWidgetDTO = GenericWidgetDTO,
> = (lines: T[]) => void;

export type WidgetType =
  | "explode"
  | "text"
  | "clock"
  | "image"
  | "gif"
  | "animation"
  | "countdown"
  | "circle"
  | "rectangle"
  | "line";

export type RGB = Record<"r" | "g" | "b", number>;
export type ColorSetter = Colors | number | RGB;

export class GenericWidgetDTO {
  id?: string;
  options?: GenericWidgetDTO;
  type: WidgetType;
}

export class AnimationWidgetDTO<
  OPTIONS extends BorderSpinOptions | CountdownOptions | PulseLaserOptions =
    | BorderSpinOptions
    | CountdownOptions
    | PulseLaserOptions,
> extends GenericWidgetDTO {
  animationOptions: OPTIONS;
  mqttEnd?: string;
  mqttStart?: string;
  order?: "pre" | "post";
}

export class StaticWidgetDTO extends GenericWidgetDTO {
  colorMode: ColorSetter;
}

export class ExplodeWidgetDTO extends StaticWidgetDTO {
  mode: "game_of_life";
}

export class DashboardWidgetDTO extends GenericWidgetDTO {
  x?: number;
  y?: number;
}

export class ManualColoring extends DashboardWidgetDTO {
  brightness?: number;
  color?: ColorSetter;
}

export class TextWidgetDTO extends ManualColoring {
  /**
   * Sane default: "5x8"
   */
  font: FONTS;
  horizontal?: HorizontalAlignment;
  kerning?: number;
  text?: string;
  vertical?: VerticalAlignment;
}

export class CountdownWidgetDTO extends ManualColoring {
  font: FONTS;
  horizontal?: HorizontalAlignment;
  kerning?: number;
  /**
   * If true, counter will count up after finishing counting down.
   * If false, counter stops at 0
   */
  overflow?: boolean;
  prefix?: string;
  suffix?: string;
  target: string;
  vertical?: VerticalAlignment;
}

// export class ScrollingTextWidgetDTO extends ManualColoring {
//   background?: ColorSetter;
//   font?: FONTS;
//   height?: number;
//   kerning?: number;
//   speed?: number;
//   text: string;
// }

export class ClockWidgetDTO extends ManualColoring {
  font: FONTS;
  format: string;
  horizontal?: HorizontalAlignment;
  kerning?: number;
  vertical?: VerticalAlignment;
}

export class ImageWidgetDTO extends DashboardWidgetDTO {
  // /**
  //  * multiply actual brightness by this value
  //  */
  // brightness?: number;
  height?: number;
  path: string;
  width?: number;
}

export class GifWidgetDTO extends ImageWidgetDTO {
  /**
   * ms, default = 100
   */
  interval?: number;
}

export class CircleWidgetDTO extends ManualColoring {
  r: number;
  declare x: number;
  declare y: number;
}

export class RectangleWidgetDTO extends ManualColoring {
  fill?: "none" | "solid" | "pulse";
  height: number;
  width: number;
}

export class LineWidgetDTO extends ManualColoring {
  endX: number;
  endY: number;
  declare x: number;
  declare y: number;
}
