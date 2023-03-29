import { is } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import { isNumberString } from "class-validator";
import execa from "execa";
import { stdout } from "process";

const DEFAULT_WIDTH = 150;
const DEFAULT_HEIGHT = 100;

@Injectable()
export class EnvironmentService {
  public get height(): number {
    const [, height] = stdout.getWindowSize();
    return height;
  }

  public get width(): number {
    const [width] = stdout.getWindowSize();
    return width;
  }

  public async getDimensions(): Promise<Record<"height" | "width", number>> {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    if (is.function(stdout.getWindowSize)) {
      const [width, height] = stdout.getWindowSize();
      return { height, width };
    }
    const lines = await execa("tput", ["lines"]);
    const cols = await execa("tput", ["cols"]);

    const height = isNumberString(lines.stdout)
      ? Number(lines.stdout)
      : DEFAULT_HEIGHT;
    const width = isNumberString(cols.stdout)
      ? Number(cols.stdout)
      : DEFAULT_WIDTH;
    return { height, width };
  }

  public limitWidth(...widths: number[]): number {
    return Math.min(
      //
      this.width,
      Math.max(...widths),
    );
  }
}
