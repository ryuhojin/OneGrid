import type {
  CellEditCommitResult,
  CellEditSession,
  EditCommitMode,
  EditCommitTrigger,
  GridEditCommitMode,
  GridOptions
} from "@onegrid/core";
import { readColumnValue } from "./editBatchRuntime.js";
import type { EditTrigger } from "./editRuntime.js";
import { OneGridBatchEditing } from "./oneGridBatchEditing.js";

export abstract class OneGridEditCommitBase<TData = unknown> extends OneGridBatchEditing<TData> {
  protected stageCommittedRow(
    result: CellEditCommitResult<TData>,
    trigger: EditCommitTrigger
  ): void {
    if (!result.valid) {
      return;
    }

    this.ensureBatchEditSession();
    const originalRow = this.editBatch.ensureOriginalRow(
      result.session,
      (rowKey) => this.findEditableRow(rowKey, undefined)
    );
    const column = this.findDataColumn(result.session.columnId);
    const previousValue = readColumnValue(originalRow.row, originalRow.rowIndex, originalRow.rowKey, column)
      ?? result.previousValue;

    this.replaceStoredRow(result.session.rowKey, originalRow.sourceIndex, result.nextRow);

    const pendingEdit = this.editBatch.stage(result, { originalRow, previousValue });
    this.pushEditHistory(result, originalRow.sourceIndex);
    this.emitCellEditStaged(pendingEdit, trigger);
  }

  protected canCommitCellEdit(
    result: CellEditCommitResult<TData>,
    trigger: EditCommitTrigger
  ): boolean {
    const before = this.emitGridBeforeEvent("beforeCellEditCommit", {
      type: "beforeCellEditCommit",
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
      trigger,
      commitMode: this.resolveBeforeEditCommitMode()
    });
    return !before.defaultPrevented;
  }

  protected getEditUndoRedoLimit(): number {
    const option = this.options.editing?.undoRedo;
    if (typeof option !== "object") {
      return 100;
    }
    const limit = option.limit;
    return limit === undefined || !Number.isFinite(limit)
      ? 100
      : Math.max(1, Math.min(10_000, Math.floor(limit)));
  }

  protected getEditCommitMode(): EditCommitMode {
    return resolveEditCommitMode(this.options.editing);
  }

  protected isReadOnlyEdit(): boolean {
    return this.options.editing?.readOnly === true;
  }

  protected canStartCellEdit(session: CellEditSession<TData>, trigger: EditTrigger): boolean {
    const before = this.emitGridBeforeEvent("beforeCellEditStart", {
      type: "beforeCellEditStart",
      row: session.row,
      rowKey: session.rowKey,
      position: {
        rowIndex: session.rowIndex,
        rowKey: session.rowKey,
        columnId: session.columnId,
        field: session.field
      },
      value: session.previousValue,
      trigger
    });
    return !before.defaultPrevented;
  }

  protected pushEditHistory(
    result: CellEditCommitResult<TData>,
    sourceIndex: number | undefined
  ): void {
    if (!this.isEditUndoRedoEnabled()) {
      return;
    }

    const entry = this.editHistory.push({
      result,
      ...(sourceIndex === undefined ? {} : { sourceIndex })
    }, this.getEditUndoRedoLimit());
    if (entry) {
      this.emitEditHistoryChanged("push", entry);
    }
  }

  private resolveBeforeEditCommitMode(): GridEditCommitMode {
    if (this.isReadOnlyEdit()) {
      return "readOnly";
    }
    return this.getEditCommitMode() === "batch" ? "batch" : "cell";
  }
}

function resolveEditCommitMode(editing: GridOptions["editing"]): EditCommitMode {
  return editing?.commitMode ?? "cell";
}
