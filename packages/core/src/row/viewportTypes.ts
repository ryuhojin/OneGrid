import type { DuplicateRowKeyPolicy, RowKeyInput } from "./rowIdentity.js";
import type {
  DataSourceRetryPolicy,
  DataSourceStatusSnapshot,
  GetRowsRequest,
  GetRowsResult
} from "../types/data.js";
import type {
  AggregateModel,
  FilterModel,
  GroupModel,
  PivotModel,
  RowKey,
  SortModel,
  ViewportRange
} from "../types/shared.js";

export interface ViewportRowModelOptions<TData = unknown> {
  readonly dataSource: {
    getRows(request: GetRowsRequest): Promise<GetRowsResult<TData>>;
  };
  readonly rowKey?: RowKeyInput<TData>;
  readonly duplicateRowKeyPolicy?: DuplicateRowKeyPolicy;
  readonly rowHeight?: number;
  readonly viewportSize?: number;
  readonly overscan?: number;
  readonly prefetchRows?: number;
  readonly highVelocityRowsPerSecond?: number;
  readonly maxCachedRanges?: number;
  readonly initialRowCount?: number;
  readonly sortModel?: readonly SortModel[];
  readonly filterModel?: FilterModel;
  readonly groupModel?: GroupModel;
  readonly aggregateModel?: AggregateModel;
  readonly pivotModel?: PivotModel;
  readonly snapshotVersion?: string;
  readonly retryPolicy?: DataSourceRetryPolicy;
}

export interface ViewportLoadInput {
  readonly scrollTop: number;
  readonly viewportHeight: number;
  readonly firstColumn?: number;
  readonly lastColumn?: number;
  readonly nowMs?: number;
}

export type ViewportRowEntry<TData = unknown> =
  | ViewportDataRowEntry<TData>
  | ViewportSkeletonRowEntry;

export interface ViewportDataRowEntry<TData = unknown> {
  readonly kind: "data";
  readonly rowIndex: number;
  readonly key: RowKey;
  readonly data: TData;
}

export interface ViewportSkeletonRowEntry {
  readonly kind: "skeleton";
  readonly rowIndex: number;
}

export interface ViewportCacheRange {
  readonly firstRow: number;
  readonly lastRow: number;
  readonly lastAccess: number;
}

export interface ViewportLoadResult<TData = unknown> {
  readonly request: GetRowsRequest;
  readonly visibleRange: ViewportRange;
  readonly requestedRange: ViewportRange;
  readonly entries: readonly ViewportRowEntry<TData>[];
  readonly rowCount: number;
  readonly cached: boolean;
  readonly stale: boolean;
  readonly prefetched: boolean;
  readonly status: DataSourceStatusSnapshot;
}

export interface ViewportLiveUpdate<TData = unknown> {
  readonly rowIndex: number;
  readonly row: TData;
  readonly rowKey?: RowKey;
}
