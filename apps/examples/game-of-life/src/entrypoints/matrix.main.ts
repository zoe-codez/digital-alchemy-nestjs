import {
  AutoLogService,
  InjectConfig,
  QuickScript,
} from "@digital-alchemy/boilerplate";
import {
  MatrixService,
  PiMatrixClientModule,
} from "@digital-alchemy/pi-matrix-client";
import {
  LIB_RGB_MATRIX,
  PANEL_COLUMNS,
  PANEL_HEIGHT,
  PANEL_TOTAL,
  PANEL_WIDTH,
  RGB,
} from "@digital-alchemy/rgb-matrix";
import {
  ADMIN_KEY,
  GENERIC_SUCCESS_RESPONSE,
  LIB_SERVER,
  ServerModule,
} from "@digital-alchemy/server";
import {
  HALF,
  NONE,
  PEAT,
  SECOND,
  SINGLE,
  sleep,
  START,
} from "@digital-alchemy/utilities";
import { Body, Get, Post, Put } from "@nestjs/common";
import { nextTick } from "process";

import { ConwayService } from "../services";
import {
  DEFAULT_AUTH_PASSWORD,
  GameConfiguration,
  GridArray,
  off,
  SetMatrixBody,
} from "../types";

@QuickScript({
  application: "game-of-life-client",
  bootstrap: {
    application: {
      config: {
        libs: {
          [LIB_SERVER]: { [ADMIN_KEY]: DEFAULT_AUTH_PASSWORD },
        },
      },
    },
    http: { enabled: true },
  },
  controller: "/",
  imports: [PiMatrixClientModule, ServerModule],
  providers: [ConwayService],
})
export class GameOfLifeClient {
  constructor(
    private readonly logger: AutoLogService,
    private readonly conway: ConwayService,
    private readonly matrix: MatrixService,
    @InjectConfig(PANEL_COLUMNS, LIB_RGB_MATRIX)
    private readonly columns: number,
    @InjectConfig(PANEL_HEIGHT, LIB_RGB_MATRIX)
    private readonly panelHeight: number,
    @InjectConfig(PANEL_WIDTH, LIB_RGB_MATRIX)
    private readonly panelWidth: number,
    @InjectConfig(PANEL_TOTAL, LIB_RGB_MATRIX)
    private readonly panelTotal: number,
  ) {
    this.totalWidth = this.panelWidth * this.columns;
    this.totalRows = Math.ceil(this.panelTotal / this.columns);
  }

  private color: RGB;
  private grid: GridArray;
  private remainingTicks = NONE;
  private tickTimeout = HALF * SECOND;

  /**
   * Total vertical count of rows
   */
  private readonly totalRows: number;

  /**
   * Total pixel count in the X direction
   */
  private readonly totalWidth: number;

  /**
   * ? Retrieve a description of the current state for the terminal app
   */
  @Get("/configuration")
  public getConfiguration(): GameConfiguration {
    return {
      color: this.color,
      grid: this.grid,
      height: this.totalRows,
      speed: this.tickTimeout,
      width: this.totalWidth,
    };
  }

  /**
   * ? Update the state of the matrix
   *
   * If passed a non-zero tick count, animation will start automatically
   */
  @Post("/color")
  public setColor(
    @Body() body: { color: RGB },
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.color = body.color;
    return GENERIC_SUCCESS_RESPONSE;
  }

  /**
   * ? Update the state of the matrix
   *
   * If passed a non-zero tick count, animation will start automatically
   */
  @Post("/matrix")
  public setMatrix(
    @Body() body: SetMatrixBody,
  ): typeof GENERIC_SUCCESS_RESPONSE {
    const running = this.remainingTicks !== NONE;
    this.remainingTicks = body.ticks;
    if (!running) {
      nextTick(() => this.tick());
    }
    return GENERIC_SUCCESS_RESPONSE;
  }

  /**
   * ? HTTP: update the matrix state
   */
  @Post("/state")
  public setState(@Body() body: GridArray): typeof GENERIC_SUCCESS_RESPONSE {
    body = this.validateBody(body);
    if (this.remainingTicks !== NONE) {
      this.logger.warn(`Hold my beer, the grid is being changed live`);
    }
    this.grid = body;
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Put("/tap")
  public tap(): typeof GENERIC_SUCCESS_RESPONSE {
    this.remainingTicks = SINGLE;
    this.tick();
    return GENERIC_SUCCESS_RESPONSE;
  }

  /**
   * ? Recalculate the state of each cell
   */
  private async tick(): Promise<void> {
    if (this.remainingTicks <= NONE) {
      this.logger.info(`No remaining ticks`);
      return;
    }
    this.remainingTicks--;
    this.logger.debug(`[%s] remaining ticks`, this.remainingTicks);
    this.grid = this.grid.map((row, rowIndex) =>
      row.map((_, colIndex) =>
        this.conway.isAlive(this.grid, rowIndex, colIndex) ? off : this.color,
      ),
    ) as GridArray;
    await this.matrix.setGrid(this.grid);
    await sleep(this.tickTimeout);
    nextTick(() => this.tick());
  }

  /**
   * ? Ensure the body has the correct number of row, and each row is fully populated with a value
   */
  private validateBody(body: GridArray): GridArray {
    return PEAT(this.totalRows).map((_, index) => {
      let row = body[index] || [];
      row = row.slice(START, this.totalWidth);
      if (row.length < this.totalWidth) {
        row.push(...PEAT(this.totalWidth - row.length, off));
      }
      return row;
    });
  }
}
