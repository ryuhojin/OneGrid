import { createRowHeightIndex } from "@onegrid/core";
import type { MeasuredRowHeightCache, RowHeightIndex } from "@onegrid/core";
import type { BodyRowEntry } from "./bodyRowRenderer.js";
import type { DomGridOptions } from "./OneGrid.js";

export type BodyRowHeightResolver<TData> = (row: TData, rowIndex: number) => number | undefined;

export const AUTO_ROW_RENDER_FALLBACK_HEIGHT = 34;

export function createBodyRowHeightResolver<TData>(
  options: DomGridOptions<TData>,
  autoRowHeightCache?: MeasuredRowHeightCache
): BodyRowHeightResolver<TData> | undefined {
  const rowHeight = options.rowHeight;
  if (rowHeight === "auto") {
    const fallbackRowHeight = getAutoBodyRenderFallbackHeight(options);
    return (_row, rowIndex) => autoRowHeightCache?.get(rowIndex) ?? fallbackRowHeight;
  }

  if (typeof rowHeight === "function") {
    return (row, rowIndex) => normalizeRowHeight(rowHeight(row, rowIndex));
  }

  return undefined;
}

export function createBodyRowHeightIndex<TData>(
  options: DomGridOptions<TData>,
  rows: readonly BodyRowEntry<TData>[],
  rowIndexOffset = 0,
  autoRowHeightCache?: MeasuredRowHeightCache
): RowHeightIndex | undefined {
  if (options.rowHeight === "auto") {
    return createAutoRowHeightIndex(options, rows, rowIndexOffset, autoRowHeightCache);
  }

  if (typeof options.rowHeight !== "function") {
    return undefined;
  }

  const rowHeight = options.rowHeight;
  return createRowHeightIndex({
    rowCount: rows.length,
    estimatedRowHeight: getEstimatedBodyRowHeight(options),
    getRowHeight: (localRowIndex) => {
      const row = rows[localRowIndex];
      return row && "data" in row
        ? normalizeRowHeight(rowHeight(row.data, rowIndexOffset + localRowIndex))
        : undefined;
    }
  });
}

export function isAutoBodyRowHeight<TData>(options: DomGridOptions<TData>): boolean {
  return options.rowHeight === "auto";
}

export function getEstimatedBodyRowHeight<TData>(options: DomGridOptions<TData>): number {
  return normalizeRowHeight(options.virtualization?.estimatedRowHeight)
    ?? normalizeRowHeight(options.virtualization?.rowHeight)
    ?? normalizeRowHeight(typeof options.rowHeight === "number" ? options.rowHeight : undefined)
    ?? 36;
}

export function getAutoBodyRenderFallbackHeight<TData>(options: DomGridOptions<TData>): number {
  return normalizeRowHeight(options.virtualization?.rowHeight)
    ?? AUTO_ROW_RENDER_FALLBACK_HEIGHT;
}

function createAutoRowHeightIndex<TData>(
  options: DomGridOptions<TData>,
  rows: readonly BodyRowEntry<TData>[],
  rowIndexOffset: number,
  autoRowHeightCache: MeasuredRowHeightCache | undefined
): RowHeightIndex {
  const estimatedRowHeight = getEstimatedBodyRowHeight(options);
  return createRowHeightIndex({
    rowCount: rows.length,
    estimatedRowHeight,
    getRowHeight: (localRowIndex) => {
      const row = rows[localRowIndex];
      const absoluteRowIndex = row && "rowIndex" in row
        ? row.rowIndex
        : rowIndexOffset + localRowIndex;
      return autoRowHeightCache?.get(absoluteRowIndex) ?? estimatedRowHeight;
    }
  });
}

function normalizeRowHeight(value: number | undefined): number | undefined {
  return Number.isFinite(value) && value !== undefined && value > 0 ? Math.round(value) : undefined;
}
