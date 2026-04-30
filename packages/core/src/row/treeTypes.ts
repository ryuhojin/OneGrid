import type { RowKeyInput } from "./rowIdentity.js";
import type { ColumnDef } from "../types/column.js";
import type { DataSource } from "../types/data.js";
import type { FilterModel, RowKey, SortModel } from "../types/shared.js";

export type TreeSelectionPolicy = "self" | "descendants";
export type TreeFilterPolicy = "strict" | "withAncestors" | "withDescendants" | "withAncestorsAndDescendants";
export type TreeSortPolicy = "none" | "siblings";
export type TreeSelectionState = "checked" | "unchecked" | "mixed";

export interface TreeRowModelOptions<TData = unknown> {
  readonly rowKey?: RowKeyInput<TData>;
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

export interface TreeRowStore<TData = unknown> {
  readonly roots: readonly RowKey[];
  readonly nodes: ReadonlyMap<RowKey, TreeNode<TData>>;
}
