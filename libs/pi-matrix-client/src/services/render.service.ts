/* eslint-disable sonarjs/no-identical-functions */
import { AutoLogService, InjectConfig } from "@digital-alchemy/boilerplate";
import { Inject, Injectable } from "@nestjs/common";
import { nextTick } from "process";
import { LedMatrixInstance } from "rpi-led-matrix";

import { UPDATE_INTERVAL } from "../config";
import { MATRIX_INSTANCE } from "../types";
import { PixelService } from "./pixel.service";
import { WidgetService } from "./widget.service";

export const AFTER_SYNC = "after-sync";
export type tAfterSync = (arguments_: {
  dt: number;
  t: number;
}) => boolean | Promise<boolean>;

@Injectable()
export class RenderService {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig(UPDATE_INTERVAL)
    private readonly updateInterval: number,
    private readonly widgetService: WidgetService,
    private readonly pixel: PixelService,
    @Inject(MATRIX_INSTANCE)
    private readonly matrix: LedMatrixInstance,
  ) {}

  /**
   * Description of the last render
   *
   * Mostly useful for debugging
   */
  public lastRender: {
    dt: number;
    t: number;
  };

  /**
   * prevent rendering updates
   */
  public paused = false;
  public renderMode: "widget" | "pixel" = "widget";

  /**
   * is there a rendering operation in flight?
   */
  private isRendering = false;

  /**
   * an update came in while a render was in progress.
   * don't sleep between renders to catch up
   */
  private renderImmediate = false;

  public render(): void {
    if (this.paused) {
      this.logger.debug("paused");
      return;
    }
    if (this.isRendering) {
      this.renderImmediate = true;
      return;
    }
    if (this.renderMode === "widget") {
      this.widgetService.render();
      return;
    }
    this.pixel.render();
  }

  protected onModuleInit(): void {
    this.renderLoop();
  }

  private renderLoop(): void {
    // This method cannot be async
    // matrix library will go 100% CPU and break everything
    this.matrix.afterSync((matrix, dt, t) => {
      this.lastRender = { dt, t };
      this.isRendering = false;
      if (this.renderImmediate) {
        this.renderImmediate = false;
        this.logger.debug(`Render immediate`);
        nextTick(async () => await this.render());
      }
    });
    setInterval(async () => {
      if (this.paused) {
        // separate block here to prevent spam debug logs
        return;
      }
      await this.render();
    }, this.updateInterval);
  }
}
