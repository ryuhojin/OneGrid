import type {
  InfiniteRowEntry,
  InfiniteRowModel,
  ServerRowModel,
  TreeRowModel,
  ViewportRowModel
} from "@onegrid/core";
import type { DomGridOptions } from "./OneGrid.js";

export interface CurrentRowCountInput<TData> {
  readonly options: DomGridOptions<TData>;
  readonly infiniteRowModel?: InfiniteRowModel<TData> | undefined;
  readonly infiniteEntries: readonly InfiniteRowEntry<TData>[];
  readonly serverRowModel?: ServerRowModel<TData> | undefined;
  readonly viewportRowModel?: ViewportRowModel<TData> | undefined;
  readonly treeRowModel?: TreeRowModel<TData> | undefined;
}

export function getCurrentRowCount<TData>(input: CurrentRowCountInput<TData>): number {
  if (input.infiniteRowModel) {
    return input.infiniteRowModel.rowCount ?? input.infiniteEntries.length;
  }

  if (input.serverRowModel) {
    return input.serverRowModel.rowCount;
  }

  if (input.viewportRowModel) {
    return input.viewportRowModel.rowCount;
  }

  if (input.treeRowModel) {
    return input.treeRowModel.rowCount;
  }

  return Array.isArray(input.options.data) ? input.options.data.length : 0;
}
