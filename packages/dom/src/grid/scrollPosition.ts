import {
  createColumnModel,
  getScrollLeftForColumn,
  getScrollTopForRow
} from "@onegrid/core";
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
  return getScrollTopForRow({
    rowIndex: input.rowIndex,
    rowCount: getCurrentRowCount(input),
    rowHeight: resolveVirtualRowHeight(input.options),
    viewportHeight: input.viewportHeight ?? resolveVirtualViewportHeight(input.options),
    currentScrollTop: input.currentScrollTop,
    align: input.align
  });
}

export function resolveScrollLeftForField<TData>(input: {
  readonly options: DomGridOptions<TData>;
  readonly columnState: ColumnUiState;
  readonly field: string;
  readonly align: ScrollAlign;
  readonly currentScrollLeft: number;
  readonly viewportWidth: number | undefined;
}): number | undefined {
  const model = createColumnModel(input.options.columns, {
    ...(input.options.columnOrder === undefined ? {} : { columnOrder: input.options.columnOrder }),
    columnState: input.columnState
  });
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
