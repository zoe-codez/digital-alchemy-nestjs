import { TextWidgetDTO } from "../render-widget.dto";

export class CountdownOptions extends TextWidgetDTO {
  public format: "hms" | "hmss";
  public interval?: number;
  public target: string;
  public declare type: "countdown";
}
