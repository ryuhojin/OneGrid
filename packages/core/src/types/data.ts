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

export interface DataSource<TData = unknown> {
  getRows(request: GetRowsRequest): Promise<GetRowsResult<TData>>;
  getChildren?(request: GetChildrenRequest): Promise<GetRowsResult<TData>>;
  updateRows?(request: UpdateRowsRequest<TData>): Promise<UpdateRowsResult<TData>>;
  getDistinctValues?(request: DistinctValuesRequest): Promise<DistinctValuesResult>;
  getAggregates?(request: AggregateRequest): Promise<AggregateResult>;
  destroy?(): void;
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
