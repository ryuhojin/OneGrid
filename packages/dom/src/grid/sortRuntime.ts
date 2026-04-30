import type { SortModel } from "@onegrid/core";

export interface HeaderSortRuntime {
  readonly sortModel: readonly SortModel[];
  toggleSort(field: string, additive: boolean): void;
}
