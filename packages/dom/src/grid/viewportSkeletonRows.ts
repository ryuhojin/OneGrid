import type { ViewportRowEntry, ViewportRowModel } from "@onegrid/core";
import {
  getSegmentedScrollTopForRow,
  resolveSegmentedVirtualRowWindow
} from "@onegrid/core";
import { getViewportHeight, getViewportRowHeight } from "./rowModelOptions.js";
import type { DomGridOptions } from "./OneGrid.js";

export function createViewportSkeletonEntries<TData>(
  rowModel: ViewportRowModel<TData> | undefined,
  rowIndex: number,
  viewportHeight: number,
  options: DomGridOptions<TData>
): readonly ViewportRowEntry<TData>[] {
  if (!rowModel) {
    return Object.freeze([]);
  }

  const rowHeight = getViewportRowHeight(options);
  const overscan = normalizeViewportOverscan(options.viewport?.overscan);
  const scrollTop = getSegmentedScrollTopForRow({
    rowCount: rowModel.rowCount,
    rowHeight,
    viewportHeight,
    rowIndex,
    align: "start",
    ...(options.virtualization?.maxScrollHeight === undefined
      ? {}
      : { maxScrollHeight: options.virtualization.maxScrollHeight })
  });
  const window = resolveSegmentedVirtualRowWindow({
    rowCount: rowModel.rowCount,
    rowHeight,
    viewportHeight,
    logicalScrollTop: scrollTop,
    overscan,
    ...(options.virtualization?.maxDomRows === undefined
      ? {}
      : { maxDomRows: options.virtualization.maxDomRows }),
    ...(options.virtualization?.maxScrollHeight === undefined
      ? {}
      : { maxScrollHeight: options.virtualization.maxScrollHeight })
  });
  const entries: ViewportRowEntry<TData>[] = [];
  for (
    let nextRowIndex = window.firstRenderedRow;
    nextRowIndex <= window.lastRenderedRow;
    nextRowIndex += 1
  ) {
    entries.push(Object.freeze({ kind: "skeleton", rowIndex: nextRowIndex }));
  }
  return Object.freeze(entries);
}

export function hasViewportVisibleRange<TData>(
  entries: readonly ViewportRowEntry<TData>[],
  firstRow: number,
  options: DomGridOptions<TData>,
  viewportHeight = getViewportHeight(options)
): boolean {
  const rowHeight = getViewportRowHeight(options);
  const visibleRows = Math.max(1, Math.ceil(viewportHeight / rowHeight));
  const lastRow = firstRow + visibleRows - 1;
  return entries.some((entry) => entry.rowIndex <= firstRow)
    && entries.some((entry) => entry.rowIndex >= lastRow);
}

function normalizeViewportOverscan(value: number | undefined): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? Math.trunc(value) : 0;
}
