import {
  getScrollLeftForColumn,
  getScrollTopForRow
} from "@onegrid/core";
import { createDomColumnModel } from "./domColumnModel.js";
import { getCurrentRowCount } from "./currentRowCount.js";
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
}): number {
  const frozenTop = normalizeFrozenCount(input.options.frozenRows?.top);
  const frozenBottom = normalizeFrozenCount(input.options.frozenRows?.bottom);
  const rowCount = getCurrentRowCount(input);
  const scrollableRowCount = Math.max(0, rowCount - frozenTop - frozenBottom);
  const scrollableRowIndex = Math.max(0, Math.min(scrollableRowCount - 1, input.rowIndex - frozenTop));

  return getScrollTopForRow({
    rowIndex: scrollableRowIndex,
    rowCount: scrollableRowCount,
    rowHeight: resolveVirtualRowHeight(input.options),
    viewportHeight: input.viewportHeight ?? resolveVirtualViewportHeight(input.options),
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
