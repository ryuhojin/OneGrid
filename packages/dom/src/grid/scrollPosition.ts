import {
  createFrozenRowSlices,
  getScrollLeftForColumn,
  getScrollTopForRow,
  getScrollTopForVariableRow,
  getSegmentedScrollTopForRow
} from "@onegrid/core";
import { createDomColumnModel } from "./domColumnModel.js";
import { getCurrentRowCount } from "./currentRowCount.js";
import { getGridRowData } from "./renderGridData.js";
import { createBodyRowHeightIndex } from "./rowHeightRuntime.js";
import { resolveVirtualRowHeight, resolveVirtualViewportHeight } from "./virtualScrollRuntime.js";
import { resolveColumnViewportWidth } from "./columnVirtualScrollRuntime.js";
import type {
  ColumnUiState,
  InfiniteRowEntry,
  InfiniteRowModel,
  ScrollAlign,
  ScrollToRowAlign,
  ServerRowModel,
  TreeRowModel,
  ViewportRowModel
} from "@onegrid/core";
import type { MeasuredRowHeightCache } from "@onegrid/core";
import type { DomGridOptions } from "./OneGrid.js";

export function resolveScrollTopForRow<TData>(input: {
  readonly options: DomGridOptions<TData>;
  readonly rowIndex: number;
  readonly align: ScrollToRowAlign;
  readonly currentScrollTop: number;
  readonly viewportHeight: number | undefined;
  readonly infiniteRowModel: InfiniteRowModel<TData> | undefined;
  readonly infiniteEntries: readonly InfiniteRowEntry<TData>[];
  readonly serverRowModel: ServerRowModel<TData> | undefined;
  readonly viewportRowModel: ViewportRowModel<TData> | undefined;
  readonly treeRowModel: TreeRowModel<TData> | undefined;
  readonly autoRowHeightCache?: MeasuredRowHeightCache;
}): number {
  const frozenTop = normalizeFrozenCount(input.options.frozenRows?.top);
  const frozenBottom = normalizeFrozenCount(input.options.frozenRows?.bottom);
  const rowCount = getCurrentRowCount(input);
  const scrollableRowCount = Math.max(0, rowCount - frozenTop - frozenBottom);
  const scrollableRowIndex = Math.max(0, Math.min(scrollableRowCount - 1, input.rowIndex - frozenTop));
  const rowHeight = resolveVirtualRowHeight(input.options);
  const viewportHeight = input.viewportHeight ?? resolveVirtualViewportHeight(input.options);

  const variableScrollTop = resolveVariableScrollTop({
    ...input,
    scrollableRowIndex,
    scrollableRowCount,
    viewportHeight
  });
  if (variableScrollTop !== undefined) {
    return variableScrollTop;
  }

  if (input.options.virtualization?.segmented === true) {
    return getSegmentedScrollTopForRow({
      rowIndex: scrollableRowIndex,
      rowCount: scrollableRowCount,
      rowHeight,
      viewportHeight,
      currentLogicalScrollTop: input.currentScrollTop,
      align: input.align,
      ...(input.options.virtualization.maxScrollHeight === undefined
        ? {}
        : { maxScrollHeight: input.options.virtualization.maxScrollHeight })
    });
  }

  return getScrollTopForRow({
    rowIndex: scrollableRowIndex,
    rowCount: scrollableRowCount,
    rowHeight,
    viewportHeight,
    currentScrollTop: input.currentScrollTop,
    align: input.align
  });
}

function resolveVariableScrollTop<TData>(input: {
  readonly options: DomGridOptions<TData>;
  readonly rowIndex: number;
  readonly scrollableRowIndex: number;
  readonly scrollableRowCount: number;
  readonly align: ScrollToRowAlign;
  readonly currentScrollTop: number;
  readonly viewportHeight: number;
  readonly infiniteRowModel: InfiniteRowModel<TData> | undefined;
  readonly serverRowModel: ServerRowModel<TData> | undefined;
  readonly viewportRowModel: ViewportRowModel<TData> | undefined;
  readonly treeRowModel: TreeRowModel<TData> | undefined;
  readonly autoRowHeightCache?: MeasuredRowHeightCache;
}): number | undefined {
  if (
    input.options.rowHeight !== "auto"
    && typeof input.options.rowHeight !== "function"
    || input.options.virtualization?.segmented === true
    || input.infiniteRowModel
    || input.serverRowModel
    || input.viewportRowModel
    || input.treeRowModel
  ) {
    return undefined;
  }

  const rowData = getGridRowData(input.options, undefined);
  const slices = createFrozenRowSlices(rowData.rows, {
    ...(input.options.frozenRows === undefined ? {} : input.options.frozenRows),
    totalRowCount: rowData.totalRowCount
  });
  const rowHeightIndex = createBodyRowHeightIndex(
    input.options,
    slices.bodyRows,
    slices.bodyOffset,
    input.autoRowHeightCache
  );
  if (!rowHeightIndex || input.scrollableRowCount === 0) {
    return undefined;
  }

  return getScrollTopForVariableRow({
    rowHeightIndex,
    rowIndex: input.scrollableRowIndex,
    viewportHeight: input.viewportHeight,
    currentScrollTop: input.currentScrollTop,
    align: input.align
  });
}

function normalizeFrozenCount(count: number | undefined): number {
  return Number.isFinite(count) && count !== undefined ? Math.max(0, Math.floor(count)) : 0;
}

export function resolveScrollLeftForField<TData>(input: {
  readonly options: DomGridOptions<TData>;
  readonly columnState: ColumnUiState;
  readonly field: string;
  readonly align: ScrollAlign;
  readonly currentScrollLeft: number;
  readonly viewportWidth: number | undefined;
}): number | undefined {
  const model = createDomColumnModel({ ...input.options, columnState: input.columnState });
  const centerColumns = model.pinnedLeafColumns.center;
  const columnIndex = centerColumns.findIndex((column) =>
    column.field === input.field || column.id === input.field
  );
  if (columnIndex < 0) {
    return undefined;
  }

  return getScrollLeftForColumn({
    columnWidths: centerColumns.map((column) => column.width),
    columnIndex,
    viewportWidth: input.viewportWidth ?? resolveColumnViewportWidth(input.options),
    currentScrollLeft: input.currentScrollLeft,
    align: input.align
  });
}
