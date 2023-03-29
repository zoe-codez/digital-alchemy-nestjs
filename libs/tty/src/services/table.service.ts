import { InjectConfig } from "@digital-alchemy/boilerplate";
import {
  ARRAY_OFFSET,
  HALF,
  is,
  SINGLE,
  START,
  TitleCase,
} from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import chalk from "chalk";
import { get } from "object-path";

import { TABLE_RENDER_ROWS } from "../config";
import {
  ObjectBuilderOptions,
  TABLE_PARTS,
  TableBuilderElement,
} from "../contracts";
import { ansiMaxLength, ansiPadEnd } from "../includes";
import { TextRenderingService } from "./text-rendering.service";

const PADDING = 1;
const EXTRA = 2;
const MIN_CELL_WIDTH = " undefined ".length;
type ColumnInfo = TableBuilderElement & { maxWidth: number };

const NAME_CELL = (i: ColumnInfo, max?: number) =>
  chalk`${" ".repeat(PADDING)}{bold.blue ${i.name.padEnd(
    (max ?? i.maxWidth) - PADDING,
    " ",
  )}}`;
const BUFFER_SIZE = 3;

@Injectable()
export class TableService<VALUE extends object = Record<string, unknown>> {
  constructor(
    private readonly text: TextRenderingService,
    @InjectConfig(TABLE_RENDER_ROWS) private readonly pageSize: number,
  ) {}

  private activeOptions: ObjectBuilderOptions<VALUE>;
  private columns: ColumnInfo[];
  private selectedCell: number;
  private selectedRow: number;
  private values: VALUE[];

  public renderTable(
    options: ObjectBuilderOptions<VALUE>,
    renderRows: VALUE[],
    selectedRow: number = START,
    selectedCell: number = START,
  ): string {
    let emptyMessage = "No rows";
    this.selectedCell = selectedCell;
    this.selectedRow = selectedRow;
    this.activeOptions = options;
    this.values = renderRows;
    this.calcColumns(this.values);
    const header = this.tableHeader();
    const r = this.rows();
    const middle_bar = [
      TABLE_PARTS.left_mid,
      this.columns
        .map(i => TABLE_PARTS.bottom.repeat(i.maxWidth))
        .join(TABLE_PARTS.mid_mid),
      TABLE_PARTS.right_mid,
    ].join("");
    if (is.empty(r)) {
      const [top, content] = header;
      if (!is.empty(emptyMessage)) {
        const length =
          ansiMaxLength(top) - emptyMessage.length - PADDING - PADDING;
        emptyMessage = [
          TABLE_PARTS.left,
          emptyMessage
            .padStart(length * HALF + emptyMessage.length, " ")
            .padEnd(length + emptyMessage.length, " ")
            .replace(
              ` ${emptyMessage} `,
              chalk.yellow.inverse(` ${emptyMessage} `),
            ),
          TABLE_PARTS.right,
        ].join("");
        return [
          top,
          content,
          [
            TABLE_PARTS.left_mid,
            this.columns
              .map(i => TABLE_PARTS.mid.repeat(i.maxWidth))
              .join(TABLE_PARTS.bottom_mid),
            TABLE_PARTS.right_mid,
          ].join(""),
          emptyMessage,
          this.footer(TABLE_PARTS.bottom),
        ].join(`\n`);
      }
      return [top, content, this.footer()].join(`\n`);
    }
    return [...header, r.join(`\n${middle_bar}\n`), this.footer()].join(`\n`);
  }

  private calcColumns(values: VALUE[]): void {
    this.columns = this.activeOptions.elements.map(item => {
      item.name ??= TitleCase(item.path);
      return {
        maxWidth: Math.max(
          MIN_CELL_WIDTH,
          PADDING + item.name.length + PADDING,
          PADDING +
            ansiMaxLength(
              ...values.map(row => {
                const value = get(row, item.path);
                return item.format ? item.format(value) : this.text.type(value);
              }),
            ) +
            PADDING,
        ),
        name: item.name,
        path: item.path,
      } as ColumnInfo;
    });
  }

  private footer(join = TABLE_PARTS.bottom_mid): string {
    return [
      TABLE_PARTS.bottom_left,
      this.columns.map(i => TABLE_PARTS.bottom.repeat(i.maxWidth)).join(join),
      TABLE_PARTS.bottom_right,
    ].join("");
  }

  private rows(): string[] {
    return this.selectRange(
      this.values.map((i, rowIndex) => {
        return [
          TABLE_PARTS.left,
          ...this.activeOptions.elements.map((element, colIndex) => {
            const value = get(i, String(element.path));
            const types = element.format
              ? element.format(value)
              : this.text.type(value);
            const content =
              " ".repeat(PADDING) +
              (this.selectedRow === rowIndex && this.selectedCell === colIndex
                ? chalk.inverse(types)
                : types);
            const cell = ansiPadEnd(content, this.columns[colIndex].maxWidth);
            const append =
              colIndex === this.columns.length - ARRAY_OFFSET
                ? TABLE_PARTS.right
                : TABLE_PARTS.middle;
            return cell + append;
          }),
        ].join("");
      }),
    );
  }

  private selectRange(entries: string[]): string[] {
    // This probably needs a refactor
    if (entries.length <= this.pageSize) {
      return entries;
    }
    let preMessage = `${this.selectedRow - BUFFER_SIZE} before`;
    let postMessage = `${
      this.values.length - this.selectedRow - Math.floor(this.pageSize * HALF)
    } after`;
    let preLength = ansiMaxLength(entries) - preMessage.length - EXTRA;
    let postLength = ansiMaxLength(entries) - postMessage.length - EXTRA;
    // <Top end of range>
    if (this.selectedRow <= BUFFER_SIZE + SINGLE) {
      const selected = entries.slice(START, this.pageSize - SINGLE);
      postMessage = `${entries.length - selected.length} after`;
      postLength = ansiMaxLength(entries) - postMessage.length - EXTRA;
      postMessage = [
        TABLE_PARTS.left,
        postMessage
          .padStart(postLength * HALF + postMessage.length, " ")
          .padEnd(postLength + postMessage.length, " ")
          .replace(` ${postMessage} `, chalk.bgCyan.black(` ${postMessage} `)),
        TABLE_PARTS.right,
      ].join("");
      return [...selected, postMessage];
    }
    // </Top end of range>
    // <Bottom end of range>
    if (
      this.selectedRow >=
      entries.length - this.pageSize + BUFFER_SIZE + SINGLE
    ) {
      const selected = entries.slice(entries.length - this.pageSize + PADDING);
      preMessage = `${entries.length - selected.length} before`;
      preLength = ansiMaxLength(entries) - preMessage.length - EXTRA;
      preMessage = [
        TABLE_PARTS.left,
        preMessage
          .padStart(preLength * HALF + preMessage.length, " ")
          .padEnd(preLength + preMessage.length, " ")
          .replace(` ${preMessage} `, chalk.bgCyan.black(` ${preMessage} `)),
        TABLE_PARTS.right,
      ].join("");
      return [preMessage, ...selected];
    }
    // </Bottom end of range>
    // <Middle of range>
    const out = entries.slice(
      this.selectedRow - BUFFER_SIZE,
      this.pageSize + this.selectedRow - BUFFER_SIZE - EXTRA,
    );
    preMessage = [
      TABLE_PARTS.left,
      preMessage
        .padStart(preLength * HALF + preMessage.length, " ")
        .padEnd(preLength + preMessage.length, " ")
        .replace(` ${preMessage} `, chalk.bgCyan.black(` ${preMessage} `)),
      TABLE_PARTS.right,
    ].join("");
    postMessage = [
      TABLE_PARTS.left,
      postMessage
        .padStart(postLength * HALF + postMessage.length, " ")
        .padEnd(postLength + postMessage.length, " ")
        .replace(` ${postMessage} `, chalk.bgCyan.black(` ${postMessage} `)),
      TABLE_PARTS.right,
    ].join("");
    return [preMessage, ...out, postMessage];
    // </Middle of range>
  }

  private tableHeader(): string[] {
    return [
      [
        TABLE_PARTS.top_left,
        this.columns
          .map(i => TABLE_PARTS.top.repeat(i.maxWidth))
          .join(TABLE_PARTS.top_mid),
        TABLE_PARTS.top_right,
      ].join(``),
      [
        TABLE_PARTS.left,
        this.columns.map(i => NAME_CELL(i)).join(TABLE_PARTS.middle),
        TABLE_PARTS.right,
      ].join(""),
      [
        TABLE_PARTS.left_mid,
        this.columns
          .map(i => TABLE_PARTS.mid.repeat(i.maxWidth))
          .join(TABLE_PARTS.mid_mid),
        TABLE_PARTS.right_mid,
      ].join(""),
    ];
  }
}
