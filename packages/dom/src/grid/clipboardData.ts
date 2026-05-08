import {
  createCellKey,
  createCellSpanModel,
  createClipboardText,
  createLocaleFormatter,
  isCellEditable
} from "@onegrid/core";
import type {
  CellSpanModel,
  ClipboardCopyOptions,
  GridSelectionState,
  LocaleFormatterBridge,
  NormalizedDataColumn,
  RowKey,
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

export interface ClipboardDataRow<TData> {
  readonly row: TData;
  readonly rowIndex: number;
  readonly rowKey: RowKey;
  readonly sourceIndex?: number;
}

export interface ClipboardDataSnapshot<TData> {
  readonly rows: readonly ClipboardDataRow<TData>[];
  readonly columns: readonly NormalizedDataColumn<TData>[];
  readonly cellSpanModel: CellSpanModel;
  readonly i18n: LocaleFormatterBridge;
}

export function createClipboardSnapshot<TData>(
  options: DomGridOptions<TData>,
  rowRenderState: RowRenderState<TData> | undefined
): ClipboardDataSnapshot<TData> {
  const columnModel = createDomColumnModel(options);
  const rows = getRows(options, rowRenderState);
  const columns = [
    ...columnModel.pinnedLeafColumns.left,
    ...columnModel.pinnedLeafColumns.center,
    ...columnModel.pinnedLeafColumns.right
  ];

  return Object.freeze({
    rows: Object.freeze(rows.flatMap((entry, index) => toClipboardRow(entry, index))),
    columns: Object.freeze(columns),
    cellSpanModel: createCellSpanModel({
      rows: createCellSpanRows(rows),
      columns,
      ...(options.merge === undefined ? {} : { options: options.merge }),
      ...(rowRenderState?.mergeMeta === undefined ? {} : { serverMeta: rowRenderState.mergeMeta }),
      ...(options.locale === undefined ? {} : { locale: options.locale })
    }),
    i18n: createLocaleFormatter(options.locale)
  });
}

export function createSelectedClipboardText<TData>(input: {
  readonly snapshot: ClipboardDataSnapshot<TData>;
  readonly selection: GridSelectionState;
  readonly activeCell?: SelectedCell;
  readonly copyOptions: ClipboardCopyOptions;
  readonly preserveMerge: boolean;
}): string {
  const range = resolveCopyRange(input.snapshot, input.selection, input.activeCell, input.copyOptions);
  if (!range || range.rows.length === 0 || range.columns.length === 0) {
    return "";
  }

  const rows = range.rows.map((row) =>
    range.columns.map((column) => createCopyCell(row, column, input.snapshot, input.preserveMerge))
  );
  return createClipboardText({
    rows,
    includeHeaders: input.copyOptions.includeHeaders === true,
    headers: range.columns.map((column) => column.headerName)
  });
}

export function isClipboardCellEditable<TData>(
  row: ClipboardDataRow<TData>,
  column: NormalizedDataColumn<TData>,
  editing: DomGridOptions<TData>["editing"]
): boolean {
  const value = readCellValue(row.row, row.rowKey, row.rowIndex, column);
  return isCellEditable(column.source, {
    ...createLocaleFormatter(),
    row: row.row,
    rowIndex: row.rowIndex,
    rowKey: row.rowKey,
    column: column.source,
    columnId: column.id,
    field: column.field,
    value,
    position: { rowIndex: row.rowIndex, rowKey: row.rowKey, columnId: column.id, field: column.field }
  }, editing);
}

export function findClipboardActiveCell(root: HTMLElement): SelectedCell | undefined {
  const active = root.querySelector<HTMLElement>(
    '[data-layout-section="body"] [role="gridcell"][data-focus-active="true"]'
  );
  if (!active) {
    return undefined;
  }

  const rowKey = active.dataset.editRowKey;
  const rowIndex = readNumber(active.dataset.rowIndex);
  const field = active.dataset.field;
  const ariaColumnIndex = readNumber(active.getAttribute("aria-colindex"));
  return rowKey === undefined || rowIndex === undefined || field === undefined || ariaColumnIndex === undefined
    ? undefined
    : { rowKey, rowIndex, field, columnIndex: ariaColumnIndex - 1 };
}

export function resolveMergedPasteTarget<TData>(
  snapshot: ClipboardDataSnapshot<TData>,
  rowIndex: number,
  columnIndex: number
): { readonly rowIndex: number; readonly columnIndex: number } {
  const span = snapshot.cellSpanModel.byCell.get(createCellKey(rowIndex, columnIndex));
  if (!span) {
    return { rowIndex, columnIndex };
  }

  return { rowIndex: span.rowIndex, columnIndex: span.columnIndex };
}

function resolveCopyRange<TData>(
  snapshot: ClipboardDataSnapshot<TData>,
  selection: GridSelectionState,
  activeCell: SelectedCell | undefined,
  copyOptions: ClipboardCopyOptions
) {
  const selectedOnly = copyOptions.selectedOnly ?? true;
  if (!selectedOnly) {
    return {
      rows: snapshot.rows,
      columns: snapshot.columns
    };
  }

  const rangeBounds = getSelectionBounds(selection, activeCell);
  if (rangeBounds) {
    return {
      rows: snapshot.rows.filter((row) =>
        row.rowIndex >= rangeBounds.firstRow && row.rowIndex <= rangeBounds.lastRow
      ),
      columns: snapshot.columns.slice(rangeBounds.firstColumn, rangeBounds.lastColumn + 1)
    };
  }

  if (selection.rowKeys.length > 0) {
    const selected = new Set(selection.rowKeys.map((rowKey) => String(rowKey)));
    return {
      rows: snapshot.rows.filter((row) => selected.has(String(row.rowKey))),
      columns: snapshot.columns
    };
  }

  return undefined;
}

function getSelectionBounds(
  selection: GridSelectionState,
  activeCell: SelectedCell | undefined
):
  | {
    readonly firstRow: number;
    readonly lastRow: number;
    readonly firstColumn: number;
    readonly lastColumn: number;
  }
  | undefined {
  if (selection.ranges.length > 0) {
    return {
      firstRow: Math.min(...selection.ranges.map((range) => range.firstRow)),
      lastRow: Math.max(...selection.ranges.map((range) => range.lastRow)),
      firstColumn: Math.min(...selection.ranges.map((range) => range.firstColumn)),
      lastColumn: Math.max(...selection.ranges.map((range) => range.lastColumn))
    };
  }

  const cells = selection.cells.length > 0 ? selection.cells : activeCell ? [activeCell] : [];
  if (cells.length === 0) {
    return undefined;
  }

  return {
    firstRow: Math.min(...cells.map((cell) => cell.rowIndex)),
    lastRow: Math.max(...cells.map((cell) => cell.rowIndex)),
    firstColumn: Math.min(...cells.map((cell) => cell.columnIndex)),
    lastColumn: Math.max(...cells.map((cell) => cell.columnIndex))
  };
}

function createCopyCell<TData>(
  row: ClipboardDataRow<TData>,
  column: NormalizedDataColumn<TData>,
  snapshot: ClipboardDataSnapshot<TData>,
  preserveMerge: boolean
) {
  const span = preserveMerge
    ? snapshot.cellSpanModel.byCell.get(createCellKey(row.rowIndex, snapshot.columns.indexOf(column)))
    : undefined;
  const covered = span !== undefined
    && (span.rowIndex !== row.rowIndex || span.columnIndex !== snapshot.columns.indexOf(column));
  const value = span && !covered
    ? span.value
    : readCellValue(row.row, row.rowKey, row.rowIndex, column);

  return {
    value: formatCopyValue(row, column, value, snapshot.i18n),
    ...(covered ? { covered } : {})
  };
}

function formatCopyValue<TData>(
  row: ClipboardDataRow<TData>,
  column: NormalizedDataColumn<TData>,
  value: unknown,
  i18n: LocaleFormatterBridge
): string {
  if (column.source.formatter) {
    return column.source.formatter({
      ...i18n,
      row: row.row,
      rowIndex: row.rowIndex,
      rowKey: row.rowKey,
      column: column.source,
      columnId: column.id,
      field: column.field,
      value,
      position: { rowIndex: row.rowIndex, rowKey: row.rowKey, columnId: column.id, field: column.field }
    });
  }

  return value === null || value === undefined ? "" : String(value);
}

function toClipboardRow<TData>(
  entry: BodyRowEntry<TData>,
  fallbackIndex: number
): readonly ClipboardDataRow<TData>[] {
  if (entry.kind !== "data" && entry.kind !== "tree") {
    return [];
  }

  return [{
    row: entry.data,
    rowIndex: "rowIndex" in entry ? entry.rowIndex : fallbackIndex,
    rowKey: entry.key,
    ...("sourceIndex" in entry ? { sourceIndex: entry.sourceIndex } : {})
  }];
}

function readNumber(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
