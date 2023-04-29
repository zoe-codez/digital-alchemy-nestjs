import { is } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

const INC = 1;

@Injectable()
export class ConwayService {
  /**
   * Y/N: should the cell live
   */
  public isAlive(
    grid: boolean[][],
    rowIndex: number,
    colIndex: number,
  ): boolean {
    const neighbors = this.neighbors(grid, rowIndex, colIndex);
    if (grid[rowIndex][colIndex]) {
      return [2, 3].includes(neighbors);
    }
    return neighbors === 3;
  }

  public neighbors(grid: boolean[][], rowIndex: number, colIndex: number) {
    const above = grid[rowIndex - INC];
    const same = grid[rowIndex];
    const below = grid[rowIndex + INC];

    const list = [same[colIndex - INC], same[colIndex + INC]];
    if (!is.empty(above)) {
      list.push(above[colIndex], above[colIndex - INC], above[colIndex + INC]);
    }
    if (!is.empty(below)) {
      list.push(below[colIndex], below[colIndex - INC], below[colIndex + INC]);
    }
    return list.filter(Boolean).length;
  }

  public tick(grid: boolean[][]) {
    return grid.map((row, rowIndex) =>
      row.map((_, colIndex) => this.isAlive(grid, rowIndex, colIndex)),
    );
  }
}
