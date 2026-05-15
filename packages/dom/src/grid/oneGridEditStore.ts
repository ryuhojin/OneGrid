import { readField } from "@onegrid/core";
import type {
  CellEditCommitResult,
  CellEditSession,
  CellPosition,
  EditCancelReason,
  EditCommitTrigger,
  GridEditHistoryChangeAction,
  GridEditHistoryEntry,
  GridBatchEditSession,
  RowKey
} from "@onegrid/core";
import type { PendingDomEdit } from "./editBatchRuntime.js";
import type { ResolvedEditableCell } from "./oneGridTypes.js";
import { OneGridSelection } from "./oneGridSelection.js";

export abstract class OneGridEditStore<TData = unknown> extends OneGridSelection<TData> {
  protected resolveEditableCell(
    rowKey: string,
    field: string,
    sourceIndex: number | undefined,
    columnId?: string
  ): ResolvedEditableCell<TData> | undefined {
    const column = this.findDataColumn(columnId ?? field);
    const rowInfo = this.findEditableRow(rowKey, sourceIndex);
    if (!column || !rowInfo) {
      return undefined;
    }

    const value = column.source.valueGetter
      ? column.source.valueGetter({
          row: rowInfo.row,
          rowIndex: rowInfo.rowIndex,
          rowKey: rowInfo.rowKey
        })
      : readField(rowInfo.row, column.field);
    return {
      ...rowInfo,
      column,
      value
    };
  }

  protected findEditableRow(
    rowKey: string,
    sourceIndex: number | undefined
  ): Omit<ResolvedEditableCell<TData>, "column" | "value"> | undefined {
    const rows = this.dataRows ?? this.options.data;
    if (Array.isArray(rows)) {
      const keyedIndex = rows.findIndex((row, index) =>
        String(this.resolveDistinctRowKey(row, index)) === rowKey
      );
      const index = sourceIndex !== undefined && rows[sourceIndex] !== undefined
        ? sourceIndex
        : keyedIndex;
      const row = index >= 0 ? rows[index] : undefined;
      if (row !== undefined) {
        return {
          row,
          rowIndex: index,
          rowKey: this.resolveDistinctRowKey(row, index),
          sourceIndex: index
        };
      }
    }

    const remoteEntry = [...this.serverEntries, ...this.infiniteEntries, ...this.viewportEntries]
      .find((entry) => "key" in entry && String(entry.key) === rowKey);
    if (
      !remoteEntry ||
      remoteEntry.kind === "skeleton" ||
      remoteEntry.kind === "group" ||
      remoteEntry.kind === "groupFooter"
    ) {
      return undefined;
    }

    return {
      row: remoteEntry.data,
      rowIndex: "rowIndex" in remoteEntry ? remoteEntry.rowIndex : 0,
      rowKey: remoteEntry.key
    };
  }

  protected applyCommittedRow(session: CellEditSession<TData>, nextRow: TData): void {
    const sourceIndex = this.findEditableRow(String(session.rowKey), undefined)?.sourceIndex;
    if (this.replaceStoredRow(session.rowKey, sourceIndex, nextRow)) {
      return;
    }

    if (this.serverRowModel) {
      void this.updateServerRows([{ rowKey: session.rowKey, row: nextRow as Partial<TData> }]);
    }
  }

  protected replaceStoredRow(
    rowKey: RowKey,
    sourceIndex: number | undefined,
    nextRow: TData
  ): boolean {
    const rows = this.dataRows ?? this.options.data;
    if (Array.isArray(rows)) {
      const index = sourceIndex !== undefined && rows[sourceIndex] !== undefined
        ? sourceIndex
        : rows.findIndex((row, rowIndex) =>
            String(this.resolveDistinctRowKey(row, rowIndex)) === String(rowKey)
          );
      if (index >= 0) {
        const nextRows = [...rows];
        nextRows[index] = nextRow;
        this.dataRows = Object.freeze(nextRows);
        this.clearAutoRowHeightCache();
        return true;
      }
    }

    let replaced = false;
    this.serverEntries = this.serverEntries.map((entry) => {
      if (String(entry.key) !== String(rowKey)) {
        return entry;
      }
      replaced = true;
      return Object.freeze({ ...entry, data: nextRow });
    });
    this.infiniteEntries = this.infiniteEntries.map((entry) => {
      if (entry.kind === "skeleton" || String(entry.key) !== String(rowKey)) {
        return entry;
      }
      replaced = true;
      return Object.freeze({ ...entry, data: nextRow });
    });
    this.viewportEntries = this.viewportEntries.map((entry) => {
      if (entry.kind === "skeleton" || String(entry.key) !== String(rowKey)) {
        return entry;
      }
      replaced = true;
      return Object.freeze({ ...entry, data: nextRow });
    });
    this.treeEntries = this.treeEntries.map((entry) => {
      if (String(entry.key) !== String(rowKey)) {
        return entry;
      }
      replaced = true;
      return Object.freeze({ ...entry, data: nextRow });
    });
    if (replaced) {
      this.clearAutoRowHeightCache();
    }
    return replaced;
  }

  protected emitCellEditStarted(session: CellEditSession<TData>): void {
    this.emitGridEvent("cellEditStarted", {
      type: "cellEditStarted",
      row: session.row,
      rowKey: session.rowKey,
      position: {
        rowIndex: session.rowIndex,
        rowKey: session.rowKey,
        columnId: session.columnId,
        field: session.field
      },
      value: session.previousValue
    });
  }

  protected emitCellEditStaged(edit: PendingDomEdit<TData>, trigger: EditCommitTrigger): void {
    this.emitGridEvent("cellEditStaged", {
      type: "cellEditStaged",
      row: edit.row,
      rowKey: edit.rowKey,
      position: edit.position,
      value: edit.nextValue,
      previousValue: edit.previousValue,
      nextValue: edit.nextValue,
      trigger
    });
  }

  protected emitPendingEditCommitted(
    edit: PendingDomEdit<TData>,
    trigger: EditCommitTrigger
  ): void {
    this.emitGridEvent("cellEditCommitted", {
      type: "cellEditCommitted",
      row: edit.row,
      rowKey: edit.rowKey,
      position: edit.position,
      value: edit.nextValue,
      previousValue: edit.previousValue,
      nextValue: edit.nextValue,
      trigger
    });
  }

  protected emitCellEditCommitted(
    result: CellEditCommitResult<TData>,
    trigger: EditCommitTrigger
  ): void {
    this.emitGridEvent("cellEditCommitted", {
      type: "cellEditCommitted",
      row: result.nextRow,
      rowKey: result.session.rowKey,
      position: {
        rowIndex: result.session.rowIndex,
        rowKey: result.session.rowKey,
        columnId: result.session.columnId,
        field: result.session.field
      },
      value: result.nextValue,
      previousValue: result.previousValue,
      nextValue: result.nextValue,
      trigger
    });
  }

  protected emitCellEditRequested(
    result: CellEditCommitResult<TData>,
    trigger: EditCommitTrigger
  ): void {
    this.emitGridEvent("cellEditRequested", {
      type: "cellEditRequested",
      row: result.session.row,
      rowKey: result.session.rowKey,
      position: {
        rowIndex: result.session.rowIndex,
        rowKey: result.session.rowKey,
        columnId: result.session.columnId,
        field: result.session.field
      },
      value: result.nextValue,
      previousValue: result.previousValue,
      nextValue: result.nextValue,
      nextRow: result.nextRow,
      trigger
    });
  }

  protected emitCellValidationFailed(result: CellEditCommitResult<TData>): void {
    this.emitGridEvent("validationFailed", {
      type: "validationFailed",
      row: result.session.row,
      rowKey: result.session.rowKey,
      position: {
        rowIndex: result.session.rowIndex,
        rowKey: result.session.rowKey,
        columnId: result.session.columnId,
        field: result.session.field
      },
      value: result.nextValue,
      issues: result.issues
    });
  }

  protected emitPendingEditCancelled(edit: PendingDomEdit<TData>, reason: EditCancelReason): void {
    const original = this.editBatch.getOriginalRow(edit.rowKey);
    this.emitGridEvent("cellEditCancelled", {
      type: "cellEditCancelled",
      row: original?.row ?? edit.row,
      rowKey: edit.rowKey,
      position: edit.position,
      value: edit.previousValue,
      reason
    });
  }

  protected emitCellEditCancelled(session: CellEditSession<TData>, reason: EditCancelReason): void {
    this.emitGridEvent("cellEditCancelled", {
      type: "cellEditCancelled",
      row: session.row,
      rowKey: session.rowKey,
      position: {
        rowIndex: session.rowIndex,
        rowKey: session.rowKey,
        columnId: session.columnId,
        field: session.field
      },
      value: session.previousValue,
      reason
    });
  }

  protected emitBatchEditSessionStarted(session: GridBatchEditSession<TData>): void {
    this.emitBatchEditSessionEvent("batchEditSessionStarted", session);
  }

  protected emitBatchEditSessionCommitted(session: GridBatchEditSession<TData>): void {
    this.emitBatchEditSessionEvent("batchEditSessionCommitted", session);
  }

  protected emitBatchEditSessionCancelled(session: GridBatchEditSession<TData>): void {
    this.emitBatchEditSessionEvent("batchEditSessionCancelled", session);
  }

  protected emitEditUndo(entry: GridEditHistoryEntry<TData>): void {
    this.emitGridEvent("editUndo", {
      type: "editUndo",
      entry,
      state: this.editHistory.getState()
    });
  }

  protected emitEditRedo(entry: GridEditHistoryEntry<TData>): void {
    this.emitGridEvent("editRedo", {
      type: "editRedo",
      entry,
      state: this.editHistory.getState()
    });
  }

  protected emitEditHistoryChanged(
    action: GridEditHistoryChangeAction,
    entry?: GridEditHistoryEntry<TData>
  ): void {
    this.emitGridEvent("editHistoryChanged", {
      type: "editHistoryChanged",
      action,
      ...(entry === undefined ? {} : { entry }),
      state: this.editHistory.getState()
    });
  }

  protected cancelActiveEdit(reason: EditCancelReason): void {
    const active = this.activeEdit;
    if (!active) {
      return;
    }
    this.activeEdit = undefined;
    active.overlay.destroy();
    this.emitCellEditCancelled(active.session, reason);
  }

  protected findCellElement(position: CellPosition): HTMLElement | undefined {
    const cells = this.root.querySelectorAll<HTMLElement>('[data-layout-section="body"] [role="gridcell"]');
    for (const cell of cells) {
      const rowMatches = position.rowKey === undefined
        ? cell.dataset.rowIndex === String(position.rowIndex)
        : cell.dataset.editRowKey === String(position.rowKey);
      const columnMatches = position.columnId === undefined
        ? cell.dataset.field === position.field
        : cell.dataset.columnId === position.columnId;
      if (
        columnMatches
        && rowMatches
      ) {
        return cell;
      }
    }
    return undefined;
  }

  private emitBatchEditSessionEvent(
    type: "batchEditSessionStarted" | "batchEditSessionCommitted" | "batchEditSessionCancelled",
    session: GridBatchEditSession<TData>
  ): void {
    this.emitGridEvent(type, { type, session, edits: session.pendingEdits });
  }
}
