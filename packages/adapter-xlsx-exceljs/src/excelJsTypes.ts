export type ExcelJsCellPrimitive = string | number | boolean | Date | null;

export interface ExcelJsCellLike {
  value?: unknown;
  text?: string;
  style?: unknown;
  font?: unknown;
  fill?: unknown;
  border?: unknown;
  alignment?: unknown;
}

export interface ExcelJsRowLike {
  readonly cellCount?: number;
  readonly actualCellCount?: number;
  readonly values?: readonly unknown[] | Record<number, unknown>;
  height?: number;
  getCell(column: number): ExcelJsCellLike;
}

export interface ExcelJsWorksheetLike {
  columns?: unknown;
  views?: readonly unknown[];
  autoFilter?: unknown;
  readonly rowCount?: number;
  readonly columnCount?: number;
  readonly actualColumnCount?: number;
  getRow(row: number): ExcelJsRowLike;
  getCell(row: number, column: number): ExcelJsCellLike;
  mergeCells(startRow: number, startColumn: number, endRow: number, endColumn: number): void;
}

export interface ExcelJsWorkbookLike {
  readonly worksheets?: readonly ExcelJsWorksheetLike[];
  readonly xlsx: {
    writeBuffer(): Promise<ArrayBuffer | Uint8Array | BufferLike>;
    load(content: ArrayBuffer | Uint8Array): Promise<unknown>;
  };
  addWorksheet(name: string): ExcelJsWorksheetLike;
  getWorksheet?(nameOrIndex: string | number): ExcelJsWorksheetLike | undefined;
}

export interface BufferLike {
  readonly byteLength: number;
  readonly buffer: ArrayBuffer;
  readonly byteOffset?: number;
}
