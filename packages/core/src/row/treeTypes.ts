import type { DuplicateRowKeyPolicy, RowKeyInput } from "./rowIdentity.js";
import type { ColumnDef } from "../types/column.js";
import type { DataSource, DataSourceRetryPolicy, DataSourceStatusSnapshot } from "../types/data.js";
import type { FilterModel, RowKey, SortModel } from "../types/shared.js";

export type TreeSelectionPolicy = "self" | "descendants";
export type TreeFilterPolicy = "strict" | "withAncestors" | "withDescendants" | "withAncestorsAndDescendants";
export type TreeSortPolicy = "none" | "siblings";
export type TreeSelectionState = "checked" | "unchecked" | "mixed";

export interface TreeRowModelOptions<TData = unknown> {
  readonly rowKey?: RowKeyInput<TData>;
  readonly duplicateRowKeyPolicy?: DuplicateRowKeyPolicy;
  readonly columns?: readonly ColumnDef<TData>[];
  readonly childrenField?: string;
  readonly hasChildrenField?: string;
  readonly lazy?: boolean;
  readonly indentSize?: number;
  readonly expandedKeys?: readonly RowKey[];
  readonly filterModel?: FilterModel;
  readonly sortModel?: readonly SortModel[];
  readonly filterPolicy?: TreeFilterPolicy;
  readonly sortPolicy?: TreeSortPolicy;
  readonly serverOnly?: boolean;
  readonly selection?: TreeRowSelectionOptions;
  readonly dataSource?: Pick<DataSource<TData>, "getChildren">;
  readonly retryPolicy?: DataSourceRetryPolicy;
}

export interface TreeRowSelectionOptions {
  readonly policy?: TreeSelectionPolicy;
  readonly selectedKeys?: readonly RowKey[];
}

export interface TreeNode<TData = unknown> {
  readonly key: RowKey;
  readonly parentKey?: RowKey;
  readonly data: TData;
  readonly depth: number;
  readonly path: readonly RowKey[];
  readonly childrenKeys: readonly RowKey[];
  readonly hasChildren: boolean;
  readonly childrenLoaded: boolean;
}

export interface TreeRowEntry<TData = unknown> {
  readonly kind: "tree";
  readonly key: RowKey;
  readonly data: TData;
  readonly rowIndex: number;
  readonly depth: number;
  readonly indent: number;
  readonly ariaLevel: number;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
  readonly selected: boolean;
  readonly selectionState: TreeSelectionState;
  readonly loading: boolean;
}

export interface TreeLoadChildrenResult<TData = unknown> {
  readonly parentKey: RowKey;
  readonly requestId: string;
  readonly rows: readonly TreeNode<TData>[];
  readonly status: DataSourceStatusSnapshot;
}

export interface TreeRowStore<TData = unknown> {
  readonly roots: readonly RowKey[];
  readonly nodes: ReadonlyMap<RowKey, TreeNode<TData>>;
}
