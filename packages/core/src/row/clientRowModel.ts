import { aggregateClientRows } from "./clientAggregate.js";
import { filterClientRows } from "./clientFilter.js";
import { groupClientRows } from "./clientGroup.js";
import { setClientRows } from "./clientTransactions.js";
import { sortClientRows } from "./clientSort.js";
import type { ClientAggregateValues } from "./clientAggregate.js";
import type { ClientRowModelEntry } from "./clientGroup.js";
import type { ClientRowNode, DuplicateRowKeyPolicy, RowKeyInput } from "./rowIdentity.js";
import type { ColumnDef } from "../types/column.js";
import type {
  AggregateModel,
  GroupFooterPosition,
  FilterModel,
  GroupModel,
  RowKey,
  SortModel
} from "../types/shared.js";

export interface ClientRowModelOptions<TData = unknown> {
  readonly rowKey?: RowKeyInput<TData>;
  readonly duplicateRowKeyPolicy?: DuplicateRowKeyPolicy;
  readonly columns?: readonly ColumnDef<TData>[];
  readonly filterModel?: FilterModel;
  readonly sortModel?: readonly SortModel[];
  readonly groupModel?: GroupModel;
  readonly groupFooter?: GroupFooterPosition;
  readonly aggregateModel?: AggregateModel;
}

export interface ClientRowModel<TData = unknown> {
  readonly rows: readonly ClientRowNode<TData>[];
  readonly filteredRows: readonly ClientRowNode<TData>[];
  readonly sortedRows: readonly ClientRowNode<TData>[];
  readonly visibleRows: readonly ClientRowModelEntry<TData>[];
  readonly aggregateValues: ClientAggregateValues;
  readonly rowCount: number;
  readonly dataRowCount: number;
  readonly byKey: ReadonlyMap<RowKey, ClientRowNode<TData>>;
}

export function createClientRowModel<TData>(
  rows: readonly TData[],
  options: ClientRowModelOptions<TData> = {}
): ClientRowModel<TData> {
  const store = setClientRows(rows, {
    ...(options.rowKey === undefined ? {} : { rowKey: options.rowKey }),
    ...(options.duplicateRowKeyPolicy === undefined
      ? {}
      : { duplicateRowKeyPolicy: options.duplicateRowKeyPolicy })
  });
  const filteredRows = filterClientRows(store.rows, options.filterModel, {
    ...(options.columns === undefined ? {} : { columns: options.columns })
  });
  const sortedRows = sortClientRows(filteredRows, options.sortModel, {
    ...(options.columns === undefined ? {} : { columns: options.columns })
  });
  const visibleRows = groupClientRows(
    sortedRows,
    options.groupModel,
    options.aggregateModel,
    options.groupFooter
  );
  const aggregateValues = aggregateClientRows(filteredRows, options.aggregateModel);

  return Object.freeze({
    rows: store.rows,
    filteredRows,
    sortedRows,
    visibleRows,
    aggregateValues,
    rowCount: visibleRows.length,
    dataRowCount: filteredRows.length,
    byKey: store.byKey
  });
}
