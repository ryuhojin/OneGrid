import type { NormalizedDataColumn } from "../column/index.js";
import { createLocaleFormatter } from "../i18n/index.js";
import type { CellContext } from "../types/column.js";
import type { MergeOptions, MergeSpan } from "../types/grid-options.js";
import type { MergeMeta } from "../types/shared.js";
import type { CellSpan, CellSpanModel, CellSpanRow } from "./cellSpanTypes.js";

export interface CellSpanModelInput<TData = unknown> {
  readonly rows: readonly CellSpanRow<TData>[];
  readonly columns: readonly NormalizedDataColumn<TData>[];
  readonly options?: MergeOptions<TData>;
  readonly serverMeta?: readonly MergeMeta[];
  readonly locale?: string;
}

interface MutableSpanIndex {
  readonly spans: CellSpan[];
  readonly byCell: Map<string, CellSpan>;
}

export function createCellSpanModel<TData>(
  input: CellSpanModelInput<TData>
): CellSpanModel {
  if (input.options?.enabled === false || input.rows.length === 0 || input.columns.length === 0) {
    return createEmptyCellSpanModel();
  }

  const index: MutableSpanIndex = { spans: [], byCell: new Map<string, CellSpan>() };
  const rowsByIndex = new Map(input.rows.map((row) => [row.rowIndex, row] as const));
  const columnsByField = new Map(input.columns.map((column, index) => [column.field, { column, index }]));
  const columnsById = new Map(input.columns.map((column, index) => [column.id, { column, index }]));

  appendServerSpans(index, input, rowsByIndex, columnsByField, columnsById);
  appendCustomSpans(index, input, rowsByIndex);
  appendValueSpans(index, input);

  return Object.freeze({
    spans: Object.freeze([...index.spans]),
    byCell: index.byCell
  });
}

export function createEmptyCellSpanModel(): CellSpanModel {
  return Object.freeze({
    spans: Object.freeze([]),
    byCell: new Map<string, CellSpan>()
  });
}

function appendServerSpans<TData>(
  index: MutableSpanIndex,
  input: CellSpanModelInput<TData>,
  rowsByIndex: ReadonlyMap<number, CellSpanRow<TData>>,
  columnsByField: ReadonlyMap<string, { readonly column: NormalizedDataColumn<TData>; readonly index: number }>,
  columnsById: ReadonlyMap<string, { readonly column: NormalizedDataColumn<TData>; readonly index: number }>
): void {
  for (const meta of input.serverMeta ?? []) {
    const columnEntry = columnsByField.get(meta.anchor.field) ?? columnsById.get(meta.anchor.field);
    if (!columnEntry) {
      continue;
    }

    const rowSpan = normalizePositiveSpan(meta.rowSpan);
    const colSpan = Math.min(normalizePositiveSpan(meta.colSpan), input.columns.length - columnEntry.index);
    addSpan(index, input.rows, {
      id: `server:${meta.anchor.rowIndex}:${columnEntry.column.id}`,
      kind: "server",
      rowIndex: meta.anchor.rowIndex,
      ...(meta.anchor.rowKey === undefined ? {} : { rowKey: meta.anchor.rowKey }),
      columnIndex: columnEntry.index,
      columnId: columnEntry.column.id,
      field: columnEntry.column.field,
      rowSpan,
      colSpan,
      value: meta.value ?? readField(rowsByIndex.get(meta.anchor.rowIndex)?.data, columnEntry.column.field)
    });
  }
}

function appendCustomSpans<TData>(
  index: MutableSpanIndex,
  input: CellSpanModelInput<TData>,
  rowsByIndex: ReadonlyMap<number, CellSpanRow<TData>>
): void {
  input.rows.forEach((row) => {
    input.columns.forEach((column, columnIndex) => {
      if (index.byCell.has(createCellKey(row.rowIndex, columnIndex))) {
        return;
      }

      const span = resolveCustomSpan(
        input.options,
        row,
        column,
        columnIndex,
        input.columns.length,
        rowsByIndex,
        input.locale
      );
      if (!span) {
        return;
      }

      addSpan(index, input.rows, span);
    });
  });
}

function resolveCustomSpan<TData>(
  options: MergeOptions<TData> | undefined,
  row: CellSpanRow<TData>,
  column: NormalizedDataColumn<TData>,
  columnIndex: number,
  columnCount: number,
  rowsByIndex: ReadonlyMap<number, CellSpanRow<TData>>,
  locale: string | undefined
): CellSpan | undefined {
  const context = createCellContext(row, column, locale);
  const optionSpan = options?.getSpan?.(context);
  const columnSpan = column.source.merge?.mode === "custom"
    ? resolveColumnSpan(column.source.merge, context)
    : undefined;
  const requested = optionSpan ?? columnSpan;
  if (!requested) {
    return undefined;
  }

  const maxRowSpan = countContiguousRows(row.rowIndex, rowsByIndex);
  const rowSpan = Math.min(normalizePositiveSpan(requested.rowSpan), maxRowSpan);
  const colSpan = Math.min(normalizePositiveSpan(requested.colSpan), columnCount - columnIndex);
  if (rowSpan <= 1 && colSpan <= 1) {
    return undefined;
  }

  return {
    id: `custom:${row.rowIndex}:${column.id}`,
    kind: "custom",
    rowIndex: row.rowIndex,
    rowKey: row.rowKey,
    columnIndex,
    columnId: column.id,
    field: column.field,
    rowSpan,
    colSpan,
    value: context.value
  };
}

function resolveColumnSpan<TData>(
  merge: NonNullable<NormalizedDataColumn<TData>["source"]["merge"]>,
  context: CellContext<TData>
): MergeSpan {
  const rowSpan = typeof merge.rowSpan === "function" ? merge.rowSpan(context) : merge.rowSpan;
  const colSpan = typeof merge.colSpan === "function" ? merge.colSpan(context) : merge.colSpan;
  return {
    rowSpan: rowSpan ?? 1,
    colSpan: colSpan ?? 1
  };
}

function appendValueSpans<TData>(
  index: MutableSpanIndex,
  input: CellSpanModelInput<TData>
): void {
  input.columns.forEach((column, columnIndex) => {
    if (!shouldValueMerge(input.options, column)) {
      return;
    }

    let start = 0;
    while (start < input.rows.length) {
      const startRow = input.rows[start];
      if (!startRow) {
        start += 1;
        continue;
      }

      const value = readField(startRow.data, column.field);
      let end = start + 1;
      while (end < input.rows.length && isSameValueRun(input.rows[end - 1], input.rows[end], column.field, value)) {
        end += 1;
      }

      const rowSpan = end - start;
      if (rowSpan > 1) {
        addSpan(index, input.rows, {
          id: `value:${startRow.rowIndex}:${column.id}`,
          kind: "value",
          rowIndex: startRow.rowIndex,
          rowKey: startRow.rowKey,
          columnIndex,
          columnId: column.id,
          field: column.field,
          rowSpan,
          colSpan: 1,
          value
        });
      }

      start = end;
    }
  });
}

function shouldValueMerge<TData>(
  options: MergeOptions<TData> | undefined,
  column: NormalizedDataColumn<TData>
): boolean {
  if (column.source.merge?.mode === "value") {
    return true;
  }

  return options?.strategy === "value"
    && (options.fields?.includes(column.field) === true || options.columnIds?.includes(column.id) === true);
}

function addSpan(
  index: MutableSpanIndex,
  rows: readonly CellSpanRow[],
  span: CellSpan
): void {
  const normalized = normalizeSpan(span);
  if (!normalized || !canIndexSpan(index, rows, normalized)) {
    return;
  }

  index.spans.push(Object.freeze(normalized));
  indexSpanCells(index, rows, normalized);
}

function normalizeSpan(span: CellSpan): CellSpan | undefined {
  const rowSpan = normalizePositiveSpan(span.rowSpan);
  const colSpan = normalizePositiveSpan(span.colSpan);
  if (rowSpan <= 1 && colSpan <= 1) {
    return undefined;
  }

  return { ...span, rowSpan, colSpan };
}

function canIndexSpan(
  index: MutableSpanIndex,
  rows: readonly CellSpanRow[],
  span: CellSpan
): boolean {
  for (const row of rows) {
    if (!isRowCovered(row.rowIndex, span)) {
      continue;
    }

    for (let columnIndex = span.columnIndex; columnIndex < span.columnIndex + span.colSpan; columnIndex += 1) {
      if (index.byCell.has(createCellKey(row.rowIndex, columnIndex))) {
        return false;
      }
    }
  }

  return true;
}

function indexSpanCells(
  index: MutableSpanIndex,
  rows: readonly CellSpanRow[],
  span: CellSpan
): void {
  for (const row of rows) {
    if (!isRowCovered(row.rowIndex, span)) {
      continue;
    }

    for (let columnIndex = span.columnIndex; columnIndex < span.columnIndex + span.colSpan; columnIndex += 1) {
      index.byCell.set(createCellKey(row.rowIndex, columnIndex), span);
    }
  }
}

function createCellContext<TData>(
  row: CellSpanRow<TData>,
  column: NormalizedDataColumn<TData>,
  locale: string | undefined
): CellContext<TData> {
  const value = readField(row.data, column.field);
  return {
    ...createLocaleFormatter(locale),
    row: row.data,
    rowIndex: row.rowIndex,
    rowKey: row.rowKey,
    column: column.source,
    columnId: column.id,
    field: column.field,
    value,
    position: {
      rowIndex: row.rowIndex,
      rowKey: row.rowKey,
      columnId: column.id,
      field: column.field
    }
  };
}

function isSameValueRun<TData>(
  previous: CellSpanRow<TData> | undefined,
  next: CellSpanRow<TData> | undefined,
  field: string,
  value: unknown
): boolean {
  return previous !== undefined
    && next !== undefined
    && next.rowIndex === previous.rowIndex + 1
    && Object.is(readField(next.data, field), value);
}

function countContiguousRows<TData>(
  rowIndex: number,
  rowsByIndex: ReadonlyMap<number, CellSpanRow<TData>>
): number {
  let count = 1;
  while (rowsByIndex.has(rowIndex + count)) {
    count += 1;
  }
  return count;
}

function isRowCovered(rowIndex: number, span: CellSpan): boolean {
  return rowIndex >= span.rowIndex && rowIndex < span.rowIndex + span.rowSpan;
}

function normalizePositiveSpan(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1;
}

function readField(row: unknown, field: string): unknown {
  if (row === null || typeof row !== "object") {
    return undefined;
  }

  return (row as Readonly<Record<string, unknown>>)[field];
}

export function createCellKey(rowIndex: number, columnIndex: number): string {
  return `${rowIndex}:${columnIndex}`;
}
