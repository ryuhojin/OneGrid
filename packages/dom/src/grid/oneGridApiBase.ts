import { applyFrozenColumnState } from "./frozenColumns.js";
import { invalidate } from "./renderInvalidation.js";
import { OneGridBase } from "./oneGridBase.js";
import type {
  ColumnDef,
  ValidationResult
} from "@onegrid/core";

export abstract class OneGridApiBase<TData = unknown> extends OneGridBase<TData> {
  setColumns(columns: readonly ColumnDef<TData>[]): void {
    if (this.destroyed) {
      return;
    }

    this.mutableOptions.columns = Object.freeze([...columns]);
    this.columnState = applyFrozenColumnState(this.options.columnState ?? {}, this.options.frozenColumns);
    this.pendingHeaderFocusField = undefined;
    void this.render(invalidate(["columns", "rows", "layout", "overlay"], "columns-api"));
  }

  showColumn(field: string): void {
    this.createColumnUiRuntime().showColumn(field);
  }

  hideColumn(field: string): void {
    this.createColumnUiRuntime().hideColumn(field);
  }

  pinColumn(field: string, side: "left" | "right" | null): void {
    this.createColumnUiRuntime().pinColumn(field, side);
  }

  autoSizeColumn(field: string): void {
    this.createColumnUiRuntime().autoSizeColumn(field);
  }

  validate(): ValidationResult {
    return Object.freeze({ valid: true, issues: Object.freeze([]) });
  }
}
