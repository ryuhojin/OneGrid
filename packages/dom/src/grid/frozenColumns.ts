import type { ColumnUiColumnState, ColumnUiState } from "@onegrid/core";
import type { DomGridOptions } from "./OneGrid.js";

export function applyFrozenColumnState<TData>(
  state: ColumnUiState,
  frozenColumns: DomGridOptions<TData>["frozenColumns"]
): ColumnUiState {
  const left = frozenColumns?.left ?? [];
  const right = frozenColumns?.right ?? [];
  if (left.length === 0 && right.length === 0) {
    return state;
  }

  const columns: Record<string, ColumnUiColumnState> = { ...(state.columns ?? {}) };
  for (const columnId of left) {
    columns[columnId] = Object.freeze({ ...(columns[columnId] ?? {}), pinned: "left" });
  }
  for (const columnId of right) {
    columns[columnId] = Object.freeze({ ...(columns[columnId] ?? {}), pinned: "right" });
  }

  return Object.freeze({
    ...state,
    columns: Object.freeze(columns)
  });
}
