import type { RowKeyInput } from "./rowIdentity.js";
import type { GetRowsRequest, GetRowsResult } from "../types/data.js";
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
}

export interface ViewportLoadInput {
  readonly scrollTop: number;
  readonly viewportHeight: number;
  readonly firstColumn?: number;
  readonly lastColumn?: number;
  readonly nowMs?: number;
}

export interface ViewportRowEntry<TData = unknown> {
  readonly kind: "data";
  readonly rowIndex: number;
  readonly key: RowKey;
  readonly data: TData;
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
}

export interface ViewportLiveUpdate<TData = unknown> {
  readonly rowIndex: number;
  readonly row: TData;
  readonly rowKey?: RowKey;
}
