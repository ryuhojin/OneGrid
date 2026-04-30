import type {
  FilterCondition,
  FilterModel,
  NormalizedDataColumn
} from "@onegrid/core";

export interface HeaderFilterRuntime {
  readonly filterModel: FilterModel;
  applyColumnFilter(field: string, conditions: readonly FilterCondition[]): void;
  applyQuickFilter(text: string): void;
  clearColumnFilter(field: string): void;
  getDistinctValues(field: string): Promise<readonly unknown[]>;
  isColumnFiltered(field: string): boolean;
  openColumnFilter(anchor: HTMLElement, column: NormalizedDataColumn): void;
}
