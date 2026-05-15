import type {
  AggregateModel,
  AggregateResult,
  CancellationSignal,
  FilterModel,
  GroupMeta,
  GroupModel,
  MergeMeta,
  PivotModel,
  RowKey,
  RowModelKind,
  SortModel,
  ViewportRange
} from "./shared.js";
import type { ColumnDef } from "./column.js";

export interface DataSource<TData = unknown> {
  getRows(request: GetRowsRequest): Promise<GetRowsResult<TData>>;
  getChildren?(request: GetChildrenRequest): Promise<GetRowsResult<TData>>;
  updateRows?(request: UpdateRowsRequest<TData>): Promise<UpdateRowsResult<TData>>;
  getDistinctValues?(request: DistinctValuesRequest): Promise<DistinctValuesResult>;
  getAggregates?(request: AggregateRequest): Promise<AggregateResult>;
  destroy?(): void;
}

export type DataSourceRequestKind =
  | "getRows"
  | "getChildren"
  | "updateRows"
  | "getDistinctValues"
  | "getAggregates";

export type DataSourceRequestStatus =
  | "idle"
  | "loading"
  | "retrying"
  | "success"
  | "error"
  | "cancelled";

export interface DataSourceRetryPolicy {
  readonly attempts?: number;
  readonly delayMs?: number;
  readonly maxDelayMs?: number;
  readonly backoff?: "none" | "linear" | "exponential";
  retry?(context: DataSourceRetryContext): boolean;
}

export interface DataSourceRetryContext {
  readonly requestKind: DataSourceRequestKind;
  readonly requestId: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly error: DataSourceError;
}

export interface DataSourceStatusSnapshot {
  readonly requestKind: DataSourceRequestKind;
  readonly requestId: string;
  readonly status: DataSourceRequestStatus;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly retryable: boolean;
  readonly recoverable: boolean;
  readonly error?: DataSourceError;
}

export interface DataSourceError {
  readonly name: string;
  readonly message: string;
  readonly requestKind: DataSourceRequestKind;
  readonly requestId: string;
  readonly attempt: number;
  readonly retryable: boolean;
  readonly recoverable: boolean;
  readonly code?: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}

export interface GetRowsRequest {
  readonly rowModel: RowModelKind;
  readonly startRow: number;
  readonly endRow: number;
  readonly page?: number;
  readonly pageSize?: number;
  readonly cursor?: string;
  readonly sortModel: readonly SortModel[];
  readonly filterModel: FilterModel;
  readonly groupModel: GroupModel;
  readonly groupKeys: readonly string[];
  readonly pivotModel?: PivotModel;
  readonly aggregateModel?: AggregateModel;
  readonly viewport?: ViewportRange;
  readonly signal?: CancellationSignal;
  readonly requestId: string;
  readonly snapshotVersion?: string;
}

export interface GetRowsResult<TData = unknown> {
  readonly rows: readonly TData[];
  readonly columns?: readonly ColumnDef<TData>[];
  readonly rowCount?: number;
  readonly nextCursor?: string;
  readonly hasMore?: boolean;
  readonly aggregate?: AggregateResult;
  readonly groupMeta?: readonly GroupMeta[];
  readonly mergeMeta?: readonly MergeMeta[];
  readonly snapshotVersion?: string;
}

export interface GetChildrenRequest {
  readonly parentKey: RowKey;
  readonly depth: number;
  readonly sortModel?: readonly SortModel[];
  readonly filterModel?: FilterModel;
  readonly requestId: string;
  readonly signal?: CancellationSignal;
}

export interface RowUpdate<TData = unknown> {
  readonly rowKey: RowKey;
  readonly row: Partial<TData>;
}

export interface UpdateRowsRequest<TData = unknown> {
  readonly updates: readonly RowUpdate<TData>[];
  readonly requestId: string;
}

export interface UpdateRowsResult<TData = unknown> {
  readonly rows: readonly TData[];
  readonly rejected?: readonly RowKey[];
}

export interface DistinctValuesRequest {
  readonly field: string;
  readonly filterModel: FilterModel;
  readonly requestId: string;
  readonly signal?: CancellationSignal;
}

export interface DistinctValuesResult {
  readonly values: readonly unknown[];
  readonly hasMore?: boolean;
}

export interface AggregateRequest {
  readonly aggregateModel: AggregateModel;
  readonly filterModel: FilterModel;
  readonly groupModel: GroupModel;
  readonly requestId: string;
  readonly signal?: CancellationSignal;
}
