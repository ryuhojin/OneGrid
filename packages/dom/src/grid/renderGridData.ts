import {
  createClientRowModel
} from "@onegrid/core";
import type {
  CellSpanRow,
  ClientRowModelOptions
} from "@onegrid/core";
import {
  createPaginationState,
  paginateRows
} from "@onegrid/pagination";
import type { BodyRowEntry } from "./bodyRowRenderer.js";
import type { DomGridOptions } from "./OneGrid.js";
import type { RowRenderState } from "./renderGridTypes.js";

export interface GridRowData<TData> {
  readonly rows: readonly BodyRowEntry<TData>[];
  readonly totalRowCount: number;
}

export function getGridRowData<TData>(
  options: DomGridOptions<TData>,
  rowRenderState: RowRenderState<TData> | undefined
): GridRowData<TData> {
  if (rowRenderState) {
    return {
      rows: rowRenderState.entries,
      totalRowCount: rowRenderState.rowCount
    };
  }

  const rowModel = createClientRowModel(
    Array.isArray(options.data) ? options.data : [],
    getClientRowModelOptions(options)
  );
  const visibleRows = rowModel.visibleRows;
  const pagination = options.pagination?.mode === "client"
    ? createPaginationState({
        mode: "client",
        ...(options.pagination.page === undefined ? {} : { page: options.pagination.page }),
        ...(options.pagination.pageSize === undefined ? {} : { pageSize: options.pagination.pageSize }),
        rowCount: visibleRows.length
      })
    : undefined;

  return {
    rows: pagination ? paginateRows(visibleRows, pagination) : visibleRows,
    totalRowCount: visibleRows.length
  };
}

export function getRows<TData>(
  options: DomGridOptions<TData>,
  rowRenderState: RowRenderState<TData> | undefined
): readonly BodyRowEntry<TData>[] {
  return getGridRowData(options, rowRenderState).rows;
}

export function createCellSpanRows<TData>(
  rows: readonly BodyRowEntry<TData>[]
): readonly CellSpanRow<TData>[] {
  return rows.flatMap((entry, index) => {
    if (entry.kind !== "data" && entry.kind !== "tree") {
      return [];
    }

    return {
      rowIndex: "rowIndex" in entry ? entry.rowIndex : index,
      rowKey: entry.key,
      data: entry.data
    };
  });
}

export function getSummaryRows<TData>(
  options: DomGridOptions<TData>,
  rows: readonly BodyRowEntry<TData>[],
  rowRenderState: RowRenderState<TData> | undefined
): readonly TData[] {
  if (!rowRenderState && Array.isArray(options.data)) {
    const rowModel = createClientRowModel(
      options.data,
      getClientRowModelOptions(options)
    );
    return rowModel.filteredRows.map((row) => row.data);
  }

  const sourceRows = rows
    .filter((row): row is Extract<BodyRowEntry<TData>, { readonly kind: "data" | "tree" }> =>
      row.kind === "data" || row.kind === "tree"
    )
    .map((row) => row.data);

  return sourceRows.length > 0
    ? sourceRows
    : Array.isArray(options.data) ? options.data : [];
}

function getClientRowModelOptions<TData>(
  options: DomGridOptions<TData>
): ClientRowModelOptions<TData> {
  const filterModel = getClientFilterModel(options);
  const sortModel = getClientSortModel(options);
  const groupModel = getClientGroupModel(options);
  const aggregateModel = getClientAggregateModel(options);

  return {
    ...(options.rowKey === undefined ? {} : { rowKey: options.rowKey }),
    ...(options.duplicateRowKeyPolicy === undefined
      ? {}
      : { duplicateRowKeyPolicy: options.duplicateRowKeyPolicy }),
    columns: options.columns,
    ...(filterModel === undefined ? {} : { filterModel }),
    ...(sortModel === undefined ? {} : { sortModel }),
    ...(groupModel === undefined ? {} : { groupModel }),
    ...(options.grouping?.footer === undefined ? {} : { groupFooter: options.grouping.footer }),
    ...(aggregateModel === undefined ? {} : { aggregateModel })
  };
}

function getClientFilterModel<TData>(options: DomGridOptions<TData>) {
  return options.filtering?.enabled === false || options.filtering?.serverOnly === true
    ? undefined
    : options.filtering?.model;
}

function getClientSortModel<TData>(options: DomGridOptions<TData>) {
  return options.sorting?.enabled === false || options.sorting?.serverOnly === true
    ? undefined
    : options.sorting?.model;
}

function getClientGroupModel<TData>(options: DomGridOptions<TData>) {
  return options.grouping?.enabled === false || options.grouping?.serverOnly === true
    ? undefined
    : options.grouping?.model;
}

function getClientAggregateModel<TData>(options: DomGridOptions<TData>) {
  return options.aggregation?.enabled === false || options.aggregation?.serverOnly === true
    ? undefined
    : options.aggregation?.model;
}
