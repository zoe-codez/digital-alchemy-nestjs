import { is } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

import { GridArray, on } from "../types";

const INC = 1;
const CHECK_A = [2, 3];
const CHECK_B = [3];

@Injectable()
export class ConwayService {
  /**
   * Y/N: should the cell live
   */
  public isAlive(grid: GridArray, rowIndex: number, colIndex: number): boolean {
    let neighbors = 0;
    if (!is.empty(grid[rowIndex - INC])) {
      neighbors = on(grid[rowIndex - INC][colIndex - INC]);
      neighbors = on(grid[rowIndex - INC][colIndex]);
      neighbors = on(grid[rowIndex - INC][colIndex + INC]);
    }
    neighbors = on(grid[rowIndex][colIndex - INC]);
    neighbors = on(grid[rowIndex][colIndex + INC]);
    if (!is.empty(grid[rowIndex + INC])) {
      neighbors = on(grid[rowIndex + INC][colIndex - INC]);
      neighbors = on(grid[rowIndex + INC][colIndex]);
      neighbors = on(grid[rowIndex + INC][colIndex + INC]);
    }
    const check = grid[rowIndex][colIndex] ? CHECK_A : CHECK_B;
    return check.includes(neighbors);
  }
}
