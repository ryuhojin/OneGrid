import {
  freezeGridStateSnapshot,
  freezeColumnUiState,
  createLocaleFormatter,
  normalizeFilterModel,
  normalizeSortModel
} from "@onegrid/core";
import { normalizePage, normalizePageSize } from "@onegrid/pagination";
import { applyFrozenColumnState } from "./frozenColumns.js";
import { createDomGridStateSnapshot, getSnapshotRowIndex } from "./gridStateRuntime.js";
import { invalidate } from "./renderInvalidation.js";
import { OneGridBase } from "./oneGridBase.js";
import type {
  ColumnDef,
  ColumnUiState,
  GridSelectionChangedEvent,
  GridSelectionState,
  GridStateSnapshot,
  SetColumnStateOptions,
  SetGridStateOptions,
  ValidationResult
} from "@onegrid/core";

export abstract class OneGridApiBase<TData = unknown> extends OneGridBase<TData> {
  getState(): GridStateSnapshot {
    return createDomGridStateSnapshot({
      columnState: this.columnState,
      sortModel: this.sortModel,
      filterModel: this.filterModel,
      groupModel: this.groupModel,
      selectionState: this.selectionState,
      locale: this.locale,
      paginationPage: this.paginationPage,
      paginationPageSize: this.paginationPageSize,
      virtualScrollTop: this.virtualScrollTop,
      columnScrollLeft: this.columnScrollLeft
    });
  }

  setState(state: GridStateSnapshot, options?: SetGridStateOptions): void {
    if (this.destroyed) {
      return;
    }

    const snapshot = freezeGridStateSnapshot(state);
    const reason = options?.reason ?? "state-api";
    const remoteModelChanged = this.applyStateSnapshot(snapshot, reason);
    if (options?.render === false) {
      return;
    }

    if (remoteModelChanged && this.resetRemoteRowModel(reason)) {
      return;
    }
    if (this.viewportRowModel && snapshot.scroll?.top !== undefined) {
      void this.scrollViewportTo(getSnapshotRowIndex(this.options, snapshot) ?? 0);
      return;
    }

    void this.render(invalidate(["columns", "rows", "layout", "overlay"], reason));
  }

  setColumns(columns: readonly ColumnDef<TData>[]): void {
    if (this.destroyed) {
      return;
    }

    this.mutableOptions.columns = Object.freeze([...columns]);
    this.columnState = applyFrozenColumnState(this.options.columnState ?? {}, this.options.frozenColumns);
    this.pendingHeaderFocusField = undefined;
    void this.render(invalidate(["columns", "rows", "layout", "overlay"], "columns-api"));
  }

  getColumnState(): ColumnUiState {
    return freezeColumnUiState(this.columnState);
  }

  setColumnState(state: ColumnUiState, options?: SetColumnStateOptions): void {
    if (this.destroyed) {
      return;
    }

    this.applyColumnState(
      applyFrozenColumnState(freezeColumnUiState(state), this.options.frozenColumns),
      options?.reason ?? "column-state-api",
      ["columns", "rows", "layout", "overlay"],
      options?.render !== false
    );
  }

  resetColumnState(options?: SetColumnStateOptions): void {
    if (this.destroyed) {
      return;
    }

    this.applyColumnState(
      applyFrozenColumnState(this.options.columnState ?? {}, this.options.frozenColumns),
      options?.reason ?? "column-state-reset",
      ["columns", "rows", "layout", "overlay"],
      options?.render !== false
    );
  }

  showColumn(columnId: string): void {
    this.createColumnUiRuntime().showColumn(columnId);
  }

  hideColumn(columnId: string): void {
    this.createColumnUiRuntime().hideColumn(columnId);
  }

  pinColumn(columnId: string, side: "left" | "right" | null): void {
    this.createColumnUiRuntime().pinColumn(columnId, side);
  }

  autoSizeColumn(columnId: string): void {
    this.createColumnUiRuntime().autoSizeColumn(columnId);
  }

  validate(): ValidationResult {
    return Object.freeze({ valid: true, issues: Object.freeze([]) });
  }

  private applyStateSnapshot(snapshot: GridStateSnapshot, reason: string): boolean {
    let remoteModelChanged = false;
    if (snapshot.columnState !== undefined) {
      const nextState = applyFrozenColumnState(snapshot.columnState, this.options.frozenColumns);
      const before = this.emitGridBeforeEvent("beforeColumnStateChange", {
        type: "beforeColumnStateChange",
        previousColumnState: freezeColumnUiState(this.columnState),
        columnState: freezeColumnUiState(nextState),
        reason
      });
      if (!before.defaultPrevented) {
        this.columnState = nextState;
      }
    }
    if (snapshot.sortModel !== undefined && this.options.sorting?.enabled !== false) {
      const sortModel = normalizeSortModel(snapshot.sortModel);
      const before = this.emitGridBeforeEvent("beforeSortChange", {
        type: "beforeSortChange",
        previousSortModel: this.sortModel,
        sortModel,
        reason
      });
      if (!before.defaultPrevented) {
        this.sortModel = sortModel;
        this.treeRowModel?.setSortModel(this.sortModel);
        this.treeEntries = this.treeRowModel?.visibleRows ?? this.treeEntries;
        remoteModelChanged = true;
      }
    }
    if (snapshot.filterModel !== undefined && this.options.filtering?.enabled !== false) {
      const filterModel = normalizeFilterModel(snapshot.filterModel);
      const before = this.emitGridBeforeEvent("beforeFilterChange", {
        type: "beforeFilterChange",
        previousFilterModel: this.filterModel,
        filterModel,
        reason
      });
      if (!before.defaultPrevented) {
        this.filterModel = filterModel;
        this.treeRowModel?.setFilterModel(this.filterModel);
        this.treeEntries = this.treeRowModel?.visibleRows ?? this.treeEntries;
        remoteModelChanged = true;
      }
    }
    if (snapshot.groupModel !== undefined) {
      this.groupModel = snapshot.groupModel;
      remoteModelChanged = true;
    }
    if (snapshot.selection !== undefined) {
      const before = this.emitGridBeforeEvent("beforeSelectionChange", {
        type: "beforeSelectionChange",
        previousSelection: this.createSelectionChangeEvent(this.selectionState),
        nextSelection: this.createSelectionChangeEvent(snapshot.selection),
        reason
      });
      if (!before.defaultPrevented) {
        this.selectionState = snapshot.selection;
      }
    }
    if (snapshot.pagination?.page !== undefined || snapshot.pagination?.pageSize !== undefined) {
      const page = snapshot.pagination.page === undefined
        ? this.paginationPage
        : normalizePage(snapshot.pagination.page);
      const pageSize = snapshot.pagination.pageSize === undefined
        ? this.paginationPageSize
        : normalizePageSize(snapshot.pagination.pageSize);
      const before = this.emitGridBeforeEvent("beforePageChange", {
        type: "beforePageChange",
        previousPage: this.paginationPage,
        previousPageSize: this.paginationPageSize,
        page,
        pageSize,
        reason
      });
      if (!before.defaultPrevented) {
        this.paginationPage = page;
        this.paginationPageSize = pageSize;
        remoteModelChanged = true;
      }
    }
    if (snapshot.scroll?.top !== undefined) {
      this.virtualScrollTop = Math.max(0, snapshot.scroll.top);
    }
    if (snapshot.scroll?.left !== undefined) {
      this.columnScrollLeft = Math.max(0, snapshot.scroll.left);
    }
    if (snapshot.locale !== undefined) {
      this.locale = createLocaleFormatter(snapshot.locale).locale;
    }

    return remoteModelChanged;
  }

  protected abstract createSelectionChangeEvent(state: GridSelectionState): GridSelectionChangedEvent<TData>;
}
