import type {
  ColumnMenuExtensionPayload,
  ColumnModel,
  ColumnUiState,
  GridPluginExtension,
  InfiniteRowEntry,
  ServerRowEntry,
  TreeRowEntry,
  ViewportRowEntry
} from "@onegrid/core";
import type { ColumnUiRuntime } from "./columnControls.js";
import { createColumnUiRuntime as createColumnUiRuntimeFromState } from "./columnUiRuntimeFactory.js";
import type { DomGridOptions } from "./oneGridTypes.js";

export interface OneGridColumnRuntimeInput<TData> {
  readonly options: DomGridOptions<TData>;
  readonly columnState: ColumnUiState;
  readonly infiniteEntries: readonly InfiniteRowEntry<TData>[];
  readonly serverEntries: readonly ServerRowEntry<TData>[];
  readonly viewportEntries: readonly ViewportRowEntry<TData>[];
  readonly treeEntries: readonly TreeRowEntry<TData>[];
  commitColumnState(
    state: ColumnUiState,
    reason: string,
    invalidationKeys: readonly ("columns" | "rows" | "layout" | "overlay")[]
  ): void;
  updateColumnState(updater: (model: ColumnModel<TData>) => ColumnUiState): void;
  getHeaderMenuExtensions(): readonly GridPluginExtension<ColumnMenuExtensionPayload>[];
}

export function createOneGridColumnUiRuntime<TData>(
  input: OneGridColumnRuntimeInput<TData>
): ColumnUiRuntime {
  const runtime = createColumnUiRuntimeFromState({
    options: input.options,
    columnState: input.columnState,
    infiniteEntries: input.infiniteEntries,
    serverEntries: input.serverEntries,
    viewportEntries: input.viewportEntries,
    treeEntries: input.treeEntries,
    setColumnState: (state) => {
      input.commitColumnState(state, "column-state", ["columns", "layout"]);
    },
    updateColumnState: (updater) => {
      input.updateColumnState(updater);
    }
  });

  return {
    ...runtime,
    headerMenuExtensions: {
      getExtensions: input.getHeaderMenuExtensions
    }
  };
}
