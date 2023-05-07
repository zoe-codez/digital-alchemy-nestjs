import {
  AnimatedBorderCallback,
  CountdownOptions,
  HMS,
  HMSS,
  TextWidgetDTO,
} from "@digital-alchemy/rgb-matrix";
import { sleep } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import dayjs from "dayjs";

import { TextService } from "../services";

@Injectable()
export class CountdownService {
  constructor(
    @Inject(forwardRef(() => TextService))
    private readonly text: TextService,
  ) {}

  public async exec({
    callback,
    format,
    interval,
    target,
    ...widget
  }: CountdownOptions & {
    callback: AnimatedBorderCallback<TextWidgetDTO>;
  }): Promise<void> {
    const end = new Date(target);
    const endTime = end.getTime();
    this.text.load(widget.font);
    while (dayjs().isBefore(end)) {
      const diff = endTime - Date.now();
      const timer = format === "hmss" ? HMSS(diff) : HMS(diff);
      widget.text ??= "";
      callback([{ ...widget, text: widget.text + timer, type: "text" }]);
      await sleep(interval);
    }
  }
}
