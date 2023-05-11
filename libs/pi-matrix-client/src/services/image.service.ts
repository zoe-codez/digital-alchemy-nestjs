import {
  AutoLogService,
  InjectConfig,
  OnEvent,
} from "@digital-alchemy/boilerplate";
import {
  GifWidgetDTO,
  ImageWidgetDTO,
  UNLOAD_WIDGETS,
} from "@digital-alchemy/rgb-matrix";
import {
  eachSeries,
  INCREMENT,
  is,
  sleep,
  START,
} from "@digital-alchemy/utilities";
import { Inject, Injectable } from "@nestjs/common";
import execa from "execa";
import { existsSync, mkdirSync, readdirSync } from "fs";
import Jimp, { intToRGBA, read } from "jimp";
import { join } from "path";
import { LedMatrixInstance } from "rpi-led-matrix";

import {
  ANIMATION_CACHE_DIRECTORY,
  DEFAULT_ANIMATION_INTERVAL,
} from "../config";
import { MATRIX_INSTANCE } from "../types";

type AnimationExtras = GifWidgetDTO & {
  cachePath?: string;
  frames?: number;
};
const MAX_BRIGHTNESS = 255;
type Cell = [red: number, green: number, blue: number, alpha: number];
export type ImageTransformOptions = {
  height?: number;
  path?: string;
  width?: number;
  x?: number;
  y?: number;
};
const MAX_INTENSITY = 1020;
const IMAGE_CACHE = (widget: ImageWidgetDTO) =>
  [widget.path, widget.height, widget.width].join(`|`);

@Injectable()
export class ImageService {
  constructor(
    private readonly logger: AutoLogService,
    @Inject(MATRIX_INSTANCE)
    private readonly matrix: LedMatrixInstance,
    @InjectConfig(ANIMATION_CACHE_DIRECTORY)
    private readonly cacheDirectory: string,
    @InjectConfig(DEFAULT_ANIMATION_INTERVAL)
    private readonly interval: number,
  ) {}

  public renderCache = new Map<string, Cell[][]>();
  private readonly animationCancel = new Set<() => void>();

  public async loadAnimation(options: GifWidgetDTO): Promise<void> {
    const cachePath = join(this.cacheDirectory, is.hash(options.path));
    if (!existsSync(cachePath)) {
      this.logger.info(`Building frame cache for {${options.path}}`);
      mkdirSync(cachePath);
      // requires imagemagick as outside dependency
      // apt-get install imagemagick
      await execa("convert", [options.path, join(cachePath, "out.png")]);
    }
    const list = readdirSync(cachePath).filter(
      i => i.startsWith("out") && i.endsWith("png"),
    );
    await eachSeries(list, async image => {
      await this.loadImage(image, options);
    });
    this.manageAnimation({
      ...options,
      cachePath,
      frames: list.length,
    });
  }

  public async loadImage(
    image: string,
    options: ImageWidgetDTO,
  ): Promise<boolean> {
    const key = IMAGE_CACHE(options);
    if (this.renderCache.has(key)) {
      return true;
    }
    if (!existsSync(image)) {
      this.logger.warn(`{${image}} does not exist`);
      return false;
    }
    this.logger.debug(`Build {${image}}`);
    const file = await read(image);
    const [height, width] = this.getDimensions(file, options);
    const grid: Cell[][] = [];
    file.resize(height, width);
    for (let rowIndex = 0; rowIndex < file.bitmap.height; rowIndex++) {
      const row: Cell[] = [];
      grid.push(row);
      for (let colIndex = 0; colIndex < file.bitmap.width; colIndex++) {
        // FIXME: what is going on with this loop?
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        for (let col = 0; col < 2; col++) {
          const intensity = this.getIntensity(file, colIndex, rowIndex);
          const { r, g, b } = intToRGBA(file.getPixelColor(colIndex, rowIndex));
          const a = Math.floor((intensity / MAX_INTENSITY) * MAX_BRIGHTNESS);
          row.push([r, g, b, a]);
        }
      }
    }
    this.renderCache.set(key, grid);
    return true;
  }

  public render(
    path: string,
    { x = START, y = START, ...options }: ImageWidgetDTO,
  ): void {
    const key = IMAGE_CACHE(options);
    const grid = this.renderCache.get(key);
    if (!grid) {
      this.logger.error(`{${path}} render before load`);
      return;
    }
    grid.forEach((row, rowIndex) => {
      row.forEach(([r, g, b, a], colIndex) => {
        this.matrix
          .fgColor({ b, g, r })
          .brightness(a)
          .setPixel(colIndex + x, rowIndex + y);
      });
    });
  }

  protected onModuleInit(): void {
    mkdirSync(this.cacheDirectory, { recursive: true });
  }

  @OnEvent(UNLOAD_WIDGETS)
  protected onWidgetUnload(): void {
    this.animationCancel.forEach(i => {
      i();
      this.animationCancel.delete(i);
    });
  }

  private getDimensions(
    { bitmap }: Jimp,
    { height, width }: Pick<ImageTransformOptions, "height" | "width">,
  ): [width: number, height: number] {
    if (width) {
      return [width, bitmap.height * (width / bitmap.width)];
    }
    if (height) {
      return [bitmap.width * (height / bitmap.height), height];
    }
    return [bitmap.width, bitmap.height];
  }

  private getIntensity(file: Jimp, x: number, y: number) {
    const { r, g, b, a } = intToRGBA(file.getPixelColor(x, y));
    return r + g + b + a;
  }

  /**
   * ! do not await this
   */
  private async manageAnimation({
    interval = this.interval,
    frames,
    cachePath,
    ...options
  }: AnimationExtras): Promise<void> {
    let running = true;
    this.animationCancel.add(() => {
      running = false;
    });
    let current = START;
    while (running) {
      // ? increment to max -> reset -> repeat
      current = current >= frames ? START : current + INCREMENT;
      options.path = join(cachePath, `out-${current}.png`);
      await sleep(interval);
    }
  }
}
