import type { RowKeyInput } from "./rowIdentity.js";
import type { GetRowsRequest, GetRowsResult, RowUpdate } from "../types/data.js";
import type {
  AggregateModel,
  FilterModel,
  GroupMeta,
  GroupModel,
  PivotModel,
  RowKey,
  SortModel
} from "../types/shared.js";

export interface ServerRowModelOptions<TData = unknown> {
  readonly dataSource: {
    getRows(request: GetRowsRequest): Promise<GetRowsResult<TData>>;
    updateRows?(request: ServerUpdateRowsRequest<TData>): Promise<ServerUpdateRowsResult<TData>>;
  };
  readonly rowKey?: RowKeyInput<TData>;
  readonly pageSize?: number;
  readonly initialPage?: number;
  readonly initialCursor?: string;
  readonly sortModel?: readonly SortModel[];
  readonly filterModel?: FilterModel;
  readonly groupModel?: GroupModel;
  readonly groupKeys?: readonly string[];
  readonly aggregateModel?: AggregateModel;
  readonly pivotModel?: PivotModel;
  readonly snapshotVersion?: string;
}

export interface ServerRowRequestState {
  readonly page: number;
  readonly pageSize: number;
  readonly requestId: string;
  readonly cursor?: string;
}

export interface ServerRowCacheEntry<TData = unknown> {
  readonly cacheKey: string;
  readonly request: GetRowsRequest;
  readonly result: GetRowsResult<TData>;
  readonly entries: readonly ServerRowEntry<TData>[];
  readonly lastAccess: number;
}

export type ServerRowEntry<TData = unknown> =
  | ServerDataRowEntry<TData>
  | ServerGroupRowEntry
  | ServerGroupFooterRowEntry;

export interface ServerDataRowEntry<TData = unknown> {
  readonly kind: "data";
  readonly rowIndex: number;
  readonly key: RowKey;
  readonly data: TData;
}

export interface ServerGroupRowEntry {
  readonly kind: "group";
  readonly key: string;
  readonly field: string;
  readonly value: unknown;
  readonly level: number;
  readonly childCount: number;
  readonly expanded: boolean;
  readonly aggregateValues: Readonly<Record<string, unknown>>;
}

export interface ServerGroupFooterRowEntry {
  readonly kind: "groupFooter";
  readonly key: string;
  readonly groupKey: string;
  readonly field: string;
  readonly value: unknown;
  readonly level: number;
  readonly childCount: number;
  readonly aggregateValues: Readonly<Record<string, unknown>>;
}

export interface ServerLoadResult<TData = unknown> {
  readonly cacheKey: string;
  readonly request: GetRowsRequest;
  readonly rows: readonly TData[];
  readonly entries: readonly ServerRowEntry<TData>[];
  readonly rowCount: number;
  readonly cached: boolean;
  readonly aggregate?: GetRowsResult<TData>["aggregate"];
  readonly groupMeta?: GetRowsResult<TData>["groupMeta"];
  readonly mergeMeta?: GetRowsResult<TData>["mergeMeta"];
  readonly nextCursor?: string;
  readonly hasMore?: boolean;
  readonly snapshotVersion?: string;
}

export type ServerGroupMeta = GroupMeta;

export interface ServerUpdateRowsRequest<TData = unknown> {
  readonly updates: readonly RowUpdate<TData>[];
  readonly requestId: string;
}

export interface ServerUpdateRowsResult<TData = unknown> {
  readonly rows: readonly TData[];
  readonly rejected?: readonly RowKey[];
}
