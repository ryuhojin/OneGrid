import {
  clearSelection,
  selectAllVisibleRows,
  selectCell,
  selectCellRange,
  selectRows,
  selectServerDataset
} from "@onegrid/core";
import type {
  GridSelectionState,
  RowKey,
  SelectedCell
} from "@onegrid/core";
import { invalidate } from "./renderInvalidation.js";
import type { GridSelectionRuntime } from "./selectionRuntime.js";
import { OneGridSortingFiltering } from "./oneGridSortingFiltering.js";

export abstract class OneGridSelection<TData = unknown> extends OneGridSortingFiltering<TData> {
  getSelectionState(): GridSelectionState {
    return this.selectionState;
  }

  getSelectedRows(): readonly TData[] {
    return this.findRowsByKeys(this.selectionState.rowKeys);
  }

  selectRows(rowKeys: readonly RowKey[]): void {
    this.updateSelection(
      selectRows(this.selectionState, rowKeys, this.options.selection),
      "selection-api-rows"
    );
  }

  selectCell(cell: SelectedCell): void {
    this.selectionAnchor = cell;
    this.updateSelection(selectCell(this.selectionState, cell), "selection-api-cell");
  }

  selectCellRange(anchor: SelectedCell, focus: SelectedCell): void {
    this.selectionAnchor = anchor;
    this.updateSelection(
      selectCellRange(this.selectionState, { anchor, focus }),
      "selection-api-range"
    );
  }

  selectAllVisibleRows(): void {
    this.updateSelection(
      selectAllVisibleRows(this.selectionState, this.getCurrentVisibleRowKeys()),
      "selection-api-visible"
    );
  }

  selectServerDataset(): void {
    this.updateSelection(this.createServerDatasetSelection(), "selection-api-server");
  }

  clearSelection(): void {
    this.updateSelection(clearSelection(this.selectionState), "selection-api-clear");
  }

  protected createSelectionRuntime(): GridSelectionRuntime | undefined {
    if (this.options.selection === undefined || this.options.selection.mode === "none") {
      return undefined;
    }

    return {
      mode: this.options.selection?.mode ?? "row",
      checkbox: this.options.selection?.checkbox === true,
      selectAllMode: this.options.selection?.selectAll ?? "visible",
      getState: () => this.selectionState,
      getAnchor: () => this.selectionAnchor,
      setAnchor: (cell) => {
        this.selectionAnchor = cell;
      },
      selectRows: (rowKeys) => {
        this.updateSelection(
          selectRows(this.selectionState, rowKeys, this.options.selection),
          "selection-runtime-rows",
          false
        );
      },
      toggleRow: (rowKey) => {
        const selected = this.selectionState.rowKeys.some((key) => String(key) === String(rowKey));
        const nextKeys = selected
          ? this.selectionState.rowKeys.filter((key) => String(key) !== String(rowKey))
          : this.options.selection?.multiple === false
            ? [rowKey]
            : [...this.selectionState.rowKeys, rowKey];
        this.updateSelection(
          selectRows(this.selectionState, nextKeys, { ...this.options.selection, multiple: true }),
          "selection-runtime-toggle-row",
          false
        );
      },
      selectCell: (cell, additive) => {
        this.selectionAnchor = cell;
        this.updateSelection(
          selectCell(
            this.selectionState,
            cell,
            additive === true && this.options.selection?.multiple !== false
          ),
          "selection-runtime-cell",
          false
        );
      },
      selectRange: (anchor, focus, additive) => {
        this.selectionAnchor = anchor;
        this.updateSelection(
          selectCellRange(this.selectionState, {
            anchor,
            focus,
            additive: additive === true && this.options.selection?.multiple !== false
          }),
          "selection-runtime-range",
          false
        );
      },
      selectAllVisible: (rowKeys) => {
        this.updateSelection(
          selectAllVisibleRows(this.selectionState, rowKeys),
          "selection-runtime-visible",
          false
        );
      },
      selectServerDataset: () => {
        this.updateSelection(this.createServerDatasetSelection(), "selection-runtime-server", false);
      },
      clear: () => {
        this.updateSelection(clearSelection(this.selectionState), "selection-runtime-clear", false);
      }
    };
  }

  protected updateSelection(state: GridSelectionState, reason: string, render = true): void {
    if (this.destroyed || sameSelectionState(this.selectionState, state)) {
      return;
    }

    this.selectionState = state;
    this.options.events?.selectionChanged?.({
      type: "selectionChanged",
      rows: this.getSelectedRows(),
      rowKeys: state.rowKeys,
      cells: state.cells,
      ranges: state.ranges,
      ...(state.allRowsToken === undefined ? {} : { allRowsToken: state.allRowsToken })
    });
    if (render) {
      void this.render(invalidate(["rows"], reason));
    }
  }

  private createServerDatasetSelection(): GridSelectionState {
    const snapshotVersion = this.options.server?.snapshotVersion ?? this.options.viewport?.snapshotVersion;
    return selectServerDataset(this.selectionState, {
      rowModel: this.options.rowModel ?? "client",
      filterModel: this.filterModel,
      sortModel: this.sortModel,
      ...(snapshotVersion === undefined ? {} : { snapshotVersion }),
      ...(this.options.selection?.serverSelectionToken === undefined
        ? {}
        : { tokenPrefix: this.options.selection.serverSelectionToken })
    });
  }

  private findRowsByKeys(rowKeys: readonly RowKey[]): readonly TData[] {
    const requested = new Set(rowKeys.map((rowKey) => String(rowKey)));
    const rows: TData[] = [];
    const seen = new Set<string>();
    const append = (rowKey: RowKey, row: TData): void => {
      const normalized = String(rowKey);
      if (requested.has(normalized) && !seen.has(normalized)) {
        seen.add(normalized);
        rows.push(row);
      }
    };

    for (const [index, row] of (this.dataRows ?? this.options.data ?? []).entries()) {
      append(this.resolveDistinctRowKey(row, index), row);
    }

    for (const entry of [
      ...this.serverEntries,
      ...this.infiniteEntries,
      ...this.viewportEntries,
      ...this.treeEntries
    ]) {
      if (entry.kind !== "skeleton" && entry.kind !== "group" && entry.kind !== "groupFooter") {
        append(entry.key, entry.data);
      }
    }

    return Object.freeze(rows);
  }
}

function sameSelectionState(left: GridSelectionState, right: GridSelectionState): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
