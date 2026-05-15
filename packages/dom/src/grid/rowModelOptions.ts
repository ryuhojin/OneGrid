import type {
  GridOptions,
  InfiniteRowModelOptions,
  ServerRowModelOptions,
  TreeRowModelOptions,
  ViewportRowModelOptions
} from "@onegrid/core";

export function createInfiniteRowModelOptions<TData>(
  options: GridOptions<TData>
): InfiniteRowModelOptions<TData> {
  const sortModel = getRemoteSortModel(options);
  const filterModel = getRemoteFilterModel(options);
  return {
    dataSource: options.dataSource as InfiniteRowModelOptions<TData>["dataSource"],
    ...(options.dataSourceOptions?.retry === undefined
      ? {}
      : { retryPolicy: options.dataSourceOptions.retry }),
    ...(options.infinite?.blockSize === undefined ? {} : { blockSize: options.infinite.blockSize }),
    ...(options.infinite?.maxBlocksInCache === undefined
      ? {}
      : { maxBlocksInCache: options.infinite.maxBlocksInCache }),
    ...(options.infinite?.initialRowCount === undefined
      ? {}
      : { initialRowCount: options.infinite.initialRowCount }),
    ...(sortModel === undefined ? {} : { sortModel }),
    ...(filterModel === undefined ? {} : { filterModel }),
    ...(options.grouping?.model === undefined ? {} : { groupModel: options.grouping.model }),
    ...(options.aggregation?.model === undefined
      ? {}
      : { aggregateModel: options.aggregation.model })
  };
}

export function createServerRowModelOptions<TData>(
  options: GridOptions<TData>
): ServerRowModelOptions<TData> {
  const sortModel = getRemoteSortModel(options);
  const filterModel = getRemoteFilterModel(options);
  const pagination = options.pagination;
  const usesPager = pagination?.mode === "server" || pagination?.mode === "cursor";
  const pageSize = getServerPageSize(options);
  return {
    dataSource: options.dataSource as ServerRowModelOptions<TData>["dataSource"],
    ...(options.dataSourceOptions?.retry === undefined
      ? {}
      : { retryPolicy: options.dataSourceOptions.retry }),
    ...(options.rowKey === undefined ? {} : { rowKey: options.rowKey }),
    ...(options.duplicateRowKeyPolicy === undefined
      ? {}
      : { duplicateRowKeyPolicy: options.duplicateRowKeyPolicy }),
    ...(pageSize === undefined ? {} : { pageSize }),
    ...(usesPager
      ? { initialPage: Math.max(0, (pagination.page ?? 1) - 1) }
      : options.server?.initialPage === undefined ? {} : { initialPage: options.server.initialPage }),
    ...(pagination?.mode === "cursor" && pagination.cursor !== undefined
      ? { initialCursor: pagination.cursor }
      : {}),
    ...(options.server?.groupKeys === undefined ? {} : { groupKeys: options.server.groupKeys }),
    ...(options.server?.snapshotVersion === undefined
      ? {}
      : { snapshotVersion: options.server.snapshotVersion }),
    ...(sortModel === undefined ? {} : { sortModel }),
    ...(filterModel === undefined ? {} : { filterModel }),
    ...(options.grouping?.model === undefined ? {} : { groupModel: options.grouping.model }),
    ...(options.aggregation?.model === undefined
      ? {}
      : { aggregateModel: options.aggregation.model }),
    ...(options.pivot?.model === undefined ? {} : { pivotModel: options.pivot.model })
  };
}

function getServerPageSize<TData>(options: GridOptions<TData>): number | undefined {
  return options.pagination?.mode === "server" || options.pagination?.mode === "cursor"
    ? options.pagination.pageSize ?? options.server?.pageSize
    : options.server?.pageSize;
}

export function createViewportRowModelOptions<TData>(
  options: GridOptions<TData>
): ViewportRowModelOptions<TData> {
  assertSegmentedViewportFixedRowHeight(options);
  const sortModel = getRemoteSortModel(options);
  const filterModel = getRemoteFilterModel(options);
  return {
    dataSource: options.dataSource as ViewportRowModelOptions<TData>["dataSource"],
    ...(options.dataSourceOptions?.retry === undefined
      ? {}
      : { retryPolicy: options.dataSourceOptions.retry }),
    ...(options.rowKey === undefined ? {} : { rowKey: options.rowKey }),
    ...(options.duplicateRowKeyPolicy === undefined
      ? {}
      : { duplicateRowKeyPolicy: options.duplicateRowKeyPolicy }),
    ...(options.viewport?.rowHeight === undefined ? {} : { rowHeight: options.viewport.rowHeight }),
    ...(options.viewport?.viewportSize === undefined
      ? {}
      : { viewportSize: options.viewport.viewportSize }),
    ...(options.viewport?.overscan === undefined ? {} : { overscan: options.viewport.overscan }),
    ...(options.viewport?.prefetchRows === undefined
      ? {}
      : { prefetchRows: options.viewport.prefetchRows }),
    ...(options.viewport?.highVelocityRowsPerSecond === undefined
      ? {}
      : { highVelocityRowsPerSecond: options.viewport.highVelocityRowsPerSecond }),
    ...(options.viewport?.maxCachedRanges === undefined
      ? {}
      : { maxCachedRanges: options.viewport.maxCachedRanges }),
    ...(options.viewport?.initialRowCount === undefined
      ? {}
      : { initialRowCount: options.viewport.initialRowCount }),
    ...(options.viewport?.snapshotVersion === undefined
      ? {}
      : { snapshotVersion: options.viewport.snapshotVersion }),
    ...(sortModel === undefined ? {} : { sortModel }),
    ...(filterModel === undefined ? {} : { filterModel }),
    ...(options.grouping?.model === undefined ? {} : { groupModel: options.grouping.model }),
    ...(options.aggregation?.model === undefined
      ? {}
      : { aggregateModel: options.aggregation.model }),
    ...(options.pivot?.model === undefined ? {} : { pivotModel: options.pivot.model })
  };
}

export function createTreeRowModelOptions<TData>(
  options: GridOptions<TData>
): TreeRowModelOptions<TData> {
  const filterModel = options.filtering?.enabled === false ? undefined : options.filtering?.model;
  const sortModel = options.sorting?.enabled === false ? undefined : options.sorting?.model;

  return {
    ...(options.rowKey === undefined ? {} : { rowKey: options.rowKey }),
    ...(options.duplicateRowKeyPolicy === undefined
      ? {}
      : { duplicateRowKeyPolicy: options.duplicateRowKeyPolicy }),
    columns: options.columns,
    ...(options.tree?.childrenField === undefined ? {} : { childrenField: options.tree.childrenField }),
    ...(options.tree?.hasChildrenField === undefined
      ? {}
      : { hasChildrenField: options.tree.hasChildrenField }),
    ...(options.tree?.lazy === undefined ? {} : { lazy: options.tree.lazy }),
    ...(options.tree?.indentSize === undefined ? {} : { indentSize: options.tree.indentSize }),
    ...(options.tree?.expandedKeys === undefined ? {} : { expandedKeys: options.tree.expandedKeys }),
    ...(filterModel === undefined ? {} : { filterModel }),
    ...(sortModel === undefined ? {} : { sortModel }),
    ...(options.tree?.filterPolicy === undefined ? {} : { filterPolicy: options.tree.filterPolicy }),
    ...(options.tree?.sortPolicy === undefined ? {} : { sortPolicy: options.tree.sortPolicy }),
    ...(options.tree?.serverOnly === undefined ? {} : { serverOnly: options.tree.serverOnly }),
    ...(options.tree?.selection === undefined ? {} : { selection: options.tree.selection }),
    ...(options.dataSourceOptions?.retry === undefined
      ? {}
      : { retryPolicy: options.dataSourceOptions.retry }),
    ...(options.dataSource === undefined ? {} : { dataSource: options.dataSource })
  };
}

function getRemoteSortModel<TData>(options: GridOptions<TData>) {
  return options.sorting?.enabled === false ? undefined : options.sorting?.model;
}

function getRemoteFilterModel<TData>(options: GridOptions<TData>) {
  return options.filtering?.enabled === false ? undefined : options.filtering?.model;
}

export function getViewportRowHeight<TData>(options: GridOptions<TData>): number {
  return options.viewport?.rowHeight ?? 36;
}

export function getViewportHeight<TData>(options: GridOptions<TData>): number {
  return (options.viewport?.viewportSize ?? 12) * getViewportRowHeight(options);
}

function assertSegmentedViewportFixedRowHeight<TData>(options: GridOptions<TData>): void {
  if (options.rowModel !== "viewport" || options.virtualization?.segmented !== true) {
    return;
  }

  if (options.rowHeight === "auto" || typeof options.rowHeight === "function") {
    throw new Error(
      "OneGrid segmented viewport row model requires a fixed numeric rowHeight. "
      + "Use viewport.rowHeight or virtualization.rowHeight for 10M~100M rows."
    );
  }

  const configuredHeights = [
    options.viewport?.rowHeight,
    options.virtualization?.rowHeight,
    typeof options.rowHeight === "number" ? options.rowHeight : undefined
  ].filter(isPositiveNumber);
  const firstHeight = configuredHeights[0];
  if (firstHeight === undefined) {
    return;
  }

  if (configuredHeights.some((height) => height !== firstHeight)) {
    throw new Error(
      "OneGrid segmented viewport row model requires one consistent fixed rowHeight "
      + "across viewport.rowHeight, virtualization.rowHeight, and rowHeight."
    );
  }
}

function isPositiveNumber(value: number | undefined): value is number {
  return Number.isFinite(value) && value !== undefined && value > 0;
}
