import type { AggregateModel, FilterModel, GroupModel, RowKey, SortModel } from "../types/shared.js";
import type { DataSource } from "../types/data.js";

export interface InfiniteRowModelOptions<TData = unknown> {
  readonly dataSource: DataSource<TData>;
  readonly blockSize?: number;
  readonly maxBlocksInCache?: number;
  readonly initialRowCount?: number;
  readonly sortModel?: readonly SortModel[];
  readonly filterModel?: FilterModel;
  readonly groupModel?: GroupModel;
  readonly aggregateModel?: AggregateModel;
}

export type InfiniteBlockStatus = "loading" | "loaded" | "cancelled" | "error";

export interface InfiniteBlock<TData = unknown> {
  readonly index: number;
  readonly startRow: number;
  readonly endRow: number;
  readonly status: InfiniteBlockStatus;
  readonly rows: readonly TData[];
  readonly rowCount?: number;
  readonly hasMore?: boolean;
  readonly requestId?: string;
  readonly error?: unknown;
  readonly lastAccess: number;
}

export type InfiniteRowEntry<TData = unknown> =
  | InfiniteDataRowEntry<TData>
  | InfiniteSkeletonRowEntry;

export interface InfiniteDataRowEntry<TData = unknown> {
  readonly kind: "data";
  readonly rowIndex: number;
  readonly key: RowKey;
  readonly data: TData;
}

export interface InfiniteSkeletonRowEntry {
  readonly kind: "skeleton";
  readonly rowIndex: number;
}

export interface InfiniteLoadResult<TData = unknown> {
  readonly block: InfiniteBlock<TData>;
  readonly deduped: boolean;
}
