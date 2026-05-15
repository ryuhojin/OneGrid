import type {
  InfiniteRowModel,
  RowModelStateSnapshot,
  ServerRowModel,
  TreeRowModel,
  ViewportRowModel
} from "@onegrid/core";

export interface RestoreInitialRowModelStateInput<TData> {
  readonly infiniteRowModel: InfiniteRowModel<TData> | undefined;
  readonly serverRowModel: ServerRowModel<TData> | undefined;
  readonly viewportRowModel: ViewportRowModel<TData> | undefined;
  readonly treeRowModel: TreeRowModel<TData> | undefined;
  readonly initialPaginationPage: number | undefined;
  readonly currentPaginationPage: number;
}

export function restoreInitialRowModelState<TData>(
  state: RowModelStateSnapshot | undefined,
  input: RestoreInitialRowModelStateInput<TData>
): number {
  if (state === undefined) {
    return input.currentPaginationPage;
  }

  switch (state.rowModel) {
    case "infinite":
      input.infiniteRowModel?.restoreState(state);
      break;
    case "server":
      input.serverRowModel?.restoreState(state);
      if (input.initialPaginationPage === undefined && state.page !== undefined) {
        return state.page + 1;
      }
      break;
    case "viewport":
      input.viewportRowModel?.restoreState(state);
      break;
    case "tree":
      input.treeRowModel?.restoreState(state);
      break;
    case "client":
      break;
  }

  return input.currentPaginationPage;
}
