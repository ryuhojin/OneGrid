import type {
  AggregateResult,
  InfiniteRowEntry,
  InfiniteRowModel,
  MergeMeta,
  ServerRowEntry,
  ServerRowModel,
  TreeRowEntry,
  TreeRowModel,
  ViewportRowEntry,
  ViewportRowModel
} from "@onegrid/core";
import type { RowRenderState } from "./renderGridShell.js";

export interface RowRenderStateFactoryInput<TData> {
  readonly infiniteRowModel?: InfiniteRowModel<TData> | undefined;
  readonly infiniteEntries: readonly InfiniteRowEntry<TData>[];
  readonly infiniteLoading: boolean;
  loadNextInfiniteBlock(): void;
  readonly serverRowModel?: ServerRowModel<TData> | undefined;
  readonly serverEntries: readonly ServerRowEntry<TData>[];
  readonly serverMergeMeta: readonly MergeMeta[];
  readonly serverAggregate?: AggregateResult | undefined;
  readonly serverLoading: boolean;
  readonly viewportRowModel?: ViewportRowModel<TData> | undefined;
  readonly viewportEntries: readonly ViewportRowEntry<TData>[];
  readonly viewportLoading: boolean;
  readonly treeRowModel?: TreeRowModel<TData> | undefined;
  readonly treeEntries: readonly TreeRowEntry<TData>[];
  readonly treeColumnField?: string;
  toggleTreeNode(key: string | number): void;
  selectTreeNode(key: string | number, selected: boolean): void;
}

export function createRowRenderState<TData>(
  input: RowRenderStateFactoryInput<TData>
): RowRenderState<TData> | undefined {
  if (input.infiniteRowModel) {
    return {
      rowModel: "infinite",
      entries: input.infiniteEntries,
      rowCount: input.infiniteRowModel.rowCount ?? input.infiniteEntries.length,
      loading: input.infiniteLoading,
      hasMore: input.infiniteRowModel.hasMore,
      ...(input.infiniteRowModel.status === undefined
        ? {}
        : { dataSourceStatus: input.infiniteRowModel.status }),
      onLoadMore: input.loadNextInfiniteBlock
    };
  }

  return createServerRowRenderState(input)
    ?? createViewportRowRenderState(input)
    ?? createTreeRowRenderState(input);
}

function createServerRowRenderState<TData>(
  input: RowRenderStateFactoryInput<TData>
): RowRenderState<TData> | undefined {
  if (!input.serverRowModel) {
    return undefined;
  }

  return {
    rowModel: "server",
    entries: input.serverEntries,
    rowCount: input.serverRowModel.rowCount,
    loading: input.serverLoading,
    hasMore: input.serverRowModel.hasMore,
    ...(input.serverRowModel.status === undefined
      ? {}
      : { dataSourceStatus: input.serverRowModel.status }),
    ...(input.serverAggregate === undefined ? {} : { aggregate: input.serverAggregate }),
    mergeMeta: input.serverMergeMeta,
    onLoadMore: () => undefined
  };
}

function createViewportRowRenderState<TData>(
  input: RowRenderStateFactoryInput<TData>
): RowRenderState<TData> | undefined {
  if (!input.viewportRowModel) {
    return undefined;
  }

  return {
    rowModel: "viewport",
    entries: input.viewportEntries,
    rowCount: input.viewportRowModel.rowCount,
    loading: input.viewportLoading,
    hasMore: false,
    ...(input.viewportRowModel.status === undefined
      ? {}
      : { dataSourceStatus: input.viewportRowModel.status }),
    onLoadMore: () => undefined
  };
}

function createTreeRowRenderState<TData>(
  input: RowRenderStateFactoryInput<TData>
): RowRenderState<TData> | undefined {
  if (!input.treeRowModel) {
    return undefined;
  }

  return {
    rowModel: "tree",
    entries: input.treeEntries,
    rowCount: input.treeRowModel.rowCount,
    loading: input.treeRowModel.status?.status === "loading"
      || input.treeRowModel.status?.status === "retrying",
    hasMore: false,
    ...(input.treeRowModel.status === undefined
      ? {}
      : { dataSourceStatus: input.treeRowModel.status }),
    onLoadMore: () => undefined,
    treeRuntime: {
      ...(input.treeColumnField === undefined ? {} : { treeColumnField: input.treeColumnField }),
      onToggleTree: input.toggleTreeNode,
      onSelectTree: input.selectTreeNode
    }
  };
}
