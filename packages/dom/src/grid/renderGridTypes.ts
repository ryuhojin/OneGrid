import type {
  AggregateResult,
  DataSourceStatusSnapshot,
  InfiniteRowEntry,
  MergeMeta,
  ServerRowEntry,
  TreeRowEntry,
  ViewportRowEntry
} from "@onegrid/core";
import type { TreeRowRuntime } from "./treeRowRenderer.js";

export interface RowRenderState<TData = unknown> {
  readonly rowModel: "infinite" | "server" | "viewport" | "tree";
  readonly entries: readonly (
    InfiniteRowEntry<TData> | ServerRowEntry<TData> | ViewportRowEntry<TData> | TreeRowEntry<TData>
  )[];
  readonly rowCount: number;
  readonly loading: boolean;
  readonly hasMore: boolean;
  readonly aggregate?: AggregateResult;
  readonly dataSourceStatus?: DataSourceStatusSnapshot;
  readonly error?: unknown;
  readonly mergeMeta?: readonly MergeMeta[];
  onLoadMore(): void;
  readonly treeRuntime?: TreeRowRuntime;
}
