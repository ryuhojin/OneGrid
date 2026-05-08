import {
  createCellKey,
  createCellSpanModel,
  createGridExport,
  createGridImport,
  createHeaderModel
} from "@onegrid/core";
import type {
  ExportOptions,
  GridExportCell,
  GridExportColumn,
  GridExportMatrix,
  GridExportResult,
  GridImportResult,
  ImportOptions,
  NormalizedDataColumn,
  SelectedCell
} from "@onegrid/core";
import { readCellValue } from "./rendererHost.js";
import {
  createCellSpanRows,
  getRows
} from "./renderGridData.js";
import type { BodyRowEntry } from "./bodyRowRenderer.js";
import { createDomColumnModel } from "./domColumnModel.js";
import type { DomGridOptions } from "./oneGridTypes.js";
import type { RowRenderState } from "./renderGridTypes.js";

export interface DomGridExportInput<TData> {
  readonly options: DomGridOptions<TData>;
  readonly rowRenderState: RowRenderState<TData> | undefined;
  readonly selection: {
    readonly rowKeys: readonly (string | number)[];
    readonly cells: readonly SelectedCell[];
    readonly ranges: readonly {
      readonly firstRow: number;
      readonly lastRow: number;
      readonly firstColumn: number;
      readonly lastColumn: number;
    }[];
  };
}

export function exportDomGridData<TData>(
  input: DomGridExportInput<TData>,
  options: ExportOptions = {}
): GridExportResult {
  return createGridExport(createDomExportMatrix(input, options), options);
}

export function importDomGridData<TData>(
  content: string | Uint8Array,
  options: ImportOptions<TData> | undefined,
  fallbackColumns: readonly GridExportColumn[]
): GridImportResult<TData> {
  return createGridImport(content, options, fallbackColumns);
}

export function createDomExportMatrix<TData>(
  input: DomGridExportInput<TData>,
  options: ExportOptions = {}
): GridExportMatrix {
  const columnModel = createDomColumnModel(input.options);
  const headerModel = createHeaderModel(columnModel, {
    ...(input.options.headerMerge === undefined ? {} : { merge: input.options.headerMerge })
  });
  const allRows = getRows(input.options, input.rowRenderState);
  const dataRows = allRows.flatMap((entry, fallbackIndex) => toExportRow(entry, fallbackIndex));
  const columnRange = resolveColumnRange(input.selection, options, headerModel.leafColumns.length);
  const rowKeys = options.selectedOnly === true && input.selection.rowKeys.length > 0
    ? new Set(input.selection.rowKeys.map((key) => String(key)))
    : undefined;
  const rows = dataRows.filter((row) =>
    rowKeys
      ? rowKeys.has(String(row.rowKey))
      : rowInSelection(row.rowIndex, input.selection, options)
  );
  const columns = headerModel.leafColumns.slice(columnRange.first, columnRange.last + 1);
  const spanModel = createCellSpanModel({
    rows: createCellSpanRows(allRows),
    columns: headerModel.leafColumns,
    ...(input.options.merge === undefined ? {} : { options: input.options.merge }),
    ...(input.rowRenderState?.mergeMeta === undefined ? {} : { serverMeta: input.rowRenderState.mergeMeta })
  });

  return Object.freeze({
    columns: Object.freeze(columns.map(toExportColumn)),
    headerRows: createHeaderExportRows(headerModel.rows, columnRange, options),
    bodyRows: Object.freeze(rows.map((row) =>
      createBodyExportRow(row, headerModel.leafColumns, columnRange, spanModel.byCell, options)
    ))
  });
}

function createHeaderExportRows(
  rows: ReturnType<typeof createHeaderModel>["rows"],
  range: ColumnRange,
  options: ExportOptions
): readonly (readonly GridExportCell[])[] {
  if (options.includeHeaders === false) {
    return Object.freeze([]);
  }
  if (options.includeHeaderMerges !== true && options.preserveVisualLayout !== true) {
    return Object.freeze([Object.freeze(rows.at(-1)?.cells
      .filter((cell) => cell.kind === "column")
      .slice(range.first, range.last + 1)
      .map((cell) => ({ value: cell.headerName })) ?? [])]);
  }
  return createHeaderRows(rows, range);
}

function createHeaderRows(
  rows: ReturnType<typeof createHeaderModel>["rows"],
  range: ColumnRange
): readonly (readonly GridExportCell[])[] {
  const output = rows.map(() => createEmptyRow(range.width));
  rows.forEach((row, rowIndex) => {
    for (const cell of row.cells) {
      const first = Math.max(cell.startLeafIndex, range.first);
      const last = Math.min(cell.endLeafIndex, range.last);
      if (first > last) continue;
      const outputRow = output[rowIndex];
      if (!outputRow) continue;
      const rowSpan = Math.min(cell.rowSpan, output.length - rowIndex);
      const colSpan = last - first + 1;
      outputRow[first - range.first] = {
        value: cell.headerName,
        rowSpan,
        colSpan
      };
      markHeaderCoveredCells(output, rowIndex, first, last, rowSpan, range);
    }
  });
  return Object.freeze(output.map((row) => Object.freeze(row)));
}

function markHeaderCoveredCells(
  rows: GridExportCell[][],
  rowIndex: number,
  first: number,
  last: number,
  rowSpan: number,
  range: ColumnRange
): void {
  for (let depth = rowIndex; depth < rowIndex + rowSpan; depth += 1) {
    const row = rows[depth];
    if (!row) continue;
    for (let column = first; column <= last; column += 1) {
      if (depth === rowIndex && column === first) continue;
      row[column - range.first] = { value: "", covered: true };
    }
  }
}

function createBodyExportRow<TData>(
  row: ExportDataRow<TData>,
  columns: readonly NormalizedDataColumn<TData>[],
  range: ColumnRange,
  spans: ReadonlyMap<string, { readonly rowIndex: number; readonly columnIndex: number; readonly rowSpan: number; readonly colSpan: number; readonly value?: unknown }>,
  options: ExportOptions
): readonly GridExportCell[] {
  return Object.freeze(columns.slice(range.first, range.last + 1).map((column, offset) => {
    const columnIndex = range.first + offset;
    const span = options.includeCellMerges === false && options.preserveVisualLayout !== true
      ? undefined
      : spans.get(createCellKey(row.rowIndex, columnIndex));
    if (span && (span.rowIndex !== row.rowIndex || span.columnIndex !== columnIndex)) {
      return { value: "", covered: true };
    }
    return {
      value: span?.value ?? readCellValue(row.data, row.rowKey, row.rowIndex, column),
      ...(span === undefined ? {} : { rowSpan: span.rowSpan, colSpan: span.colSpan })
    };
  }));
}

function resolveColumnRange(
  selection: DomGridExportInput<unknown>["selection"],
  options: ExportOptions,
  columnCount: number
): ColumnRange {
  if (options.selectedOnly !== true) {
    return { first: 0, last: Math.max(0, columnCount - 1), width: columnCount };
  }
  const ranges = selection.ranges;
  const cells = selection.cells;
  const first = ranges.length > 0
    ? Math.min(...ranges.map((range) => range.firstColumn))
    : cells.length > 0 ? Math.min(...cells.map((cell) => cell.columnIndex)) : 0;
  const last = ranges.length > 0
    ? Math.max(...ranges.map((range) => range.lastColumn))
    : cells.length > 0 ? Math.max(...cells.map((cell) => cell.columnIndex)) : columnCount - 1;
  const clippedFirst = clamp(first, 0, Math.max(0, columnCount - 1));
  const clippedLast = clamp(last, clippedFirst, Math.max(0, columnCount - 1));
  return { first: clippedFirst, last: clippedLast, width: clippedLast - clippedFirst + 1 };
}

function rowInSelection(
  rowIndex: number,
  selection: DomGridExportInput<unknown>["selection"],
  options: ExportOptions
): boolean {
  if (options.selectedOnly !== true) return true;
  if (selection.ranges.some((range) => rowIndex >= range.firstRow && rowIndex <= range.lastRow)) return true;
  return selection.cells.some((cell) => cell.rowIndex === rowIndex);
}

function toExportColumn<TData>(column: NormalizedDataColumn<TData>): GridExportColumn {
  return { id: column.id, field: column.field, headerName: column.headerName };
}

interface ExportDataRow<TData> {
  readonly data: TData;
  readonly rowIndex: number;
  readonly rowKey: string | number;
  readonly sourceIndex?: number;
}

function toExportRow<TData>(
  entry: BodyRowEntry<TData>,
  fallbackIndex: number
): readonly ExportDataRow<TData>[] {
  if (entry.kind !== "data" && entry.kind !== "tree") {
    return [];
  }
  return [{
    data: entry.data,
    rowIndex: "rowIndex" in entry ? entry.rowIndex : fallbackIndex,
    rowKey: entry.key,
    ...("sourceIndex" in entry ? { sourceIndex: entry.sourceIndex } : {})
  }];
}

interface ColumnRange {
  readonly first: number;
  readonly last: number;
  readonly width: number;
}

function createEmptyRow(width: number): GridExportCell[] {
  return Array.from({ length: width }, () => ({ value: "" }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
