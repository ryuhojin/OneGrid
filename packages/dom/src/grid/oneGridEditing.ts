import {
  commitCellEdit,
  startCellEdit
} from "@onegrid/core";
import type {
  CellEditCommitResult,
  CellPosition,
  CommitPendingEditsOptions,
  EditBlurAction,
  EditCancelReason,
  EditCommitMode,
  EditCommitTrigger,
  GridOptions,
  GridPendingEdit
} from "@onegrid/core";
import { readColumnValue } from "./editBatchRuntime.js";
import { readCellEditTarget } from "./editRuntime.js";
import type { EditTrigger, GridEditRuntime, GridStopEditOptions } from "./editRuntime.js";
import { openCellEditor } from "./editorOverlay.js";
import { OneGridEditStore } from "./oneGridEditStore.js";
import { invalidate } from "./renderInvalidation.js";

export class OneGridEditing<TData = unknown> extends OneGridEditStore<TData> {
  startEdit(position: CellPosition): void {
    const cell = this.findCellElement(position);
    if (cell) {
      this.startEditFromCell(cell, "api");
    }
  }

  stopEdit(options?: GridStopEditOptions): void {
    const commit = options?.commit ?? true;
    if (!this.activeEdit) {
      return;
    }

    if (commit) {
      void this.activeEdit.overlay.commit(options?.validate ?? true, "api");
      return;
    }

    const cancelled = this.activeEdit;
    this.activeEdit = undefined;
    cancelled.overlay.destroy();
    this.emitCellEditCancelled(cancelled.session, "api");
  }

  getPendingEdits(): readonly GridPendingEdit<TData>[] {
    return this.editBatch.getPendingEdits();
  }

  async commitPendingEdits(options?: CommitPendingEditsOptions): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const active = this.activeEdit;
    if (active) {
      const committed = await active.overlay.commit(options?.validate ?? true, "api");
      if (!committed) {
        return;
      }
    }

    if (this.editBatch.size === 0) {
      return;
    }

    const edits = this.editBatch.getEdits();
    this.editBatch.clear();
    for (const edit of edits) {
      this.emitPendingEditCommitted(edit, "api");
    }
    await this.render(invalidate(["rows", "layout"], "cell-edit-batch-commit"));
  }

  cancelPendingEdits(): void {
    if (this.destroyed) {
      return;
    }

    const active = this.activeEdit;
    if (active) {
      this.cancelActiveEdit("api");
    }

    if (this.editBatch.size === 0) {
      return;
    }

    const edits = this.editBatch.getEdits();
    const originals = this.editBatch.getOriginalRows();
    for (const original of originals) {
      this.replaceStoredRow(original.rowKey, original.sourceIndex, original.row);
    }
    for (const edit of edits) {
      this.emitPendingEditCancelled(edit, "api");
    }
    this.editBatch.clear();
    void this.render(invalidate(["rows", "layout"], "cell-edit-batch-cancel"));
  }

  protected createEditRuntime(): GridEditRuntime {
    return {
      startEditFromCell: (cell, trigger, initialValue) =>
        this.startEditFromCell(cell, trigger, initialValue),
      stopEdit: (options) => {
        this.stopEdit(options);
      },
      isEditingCell: (cell) => {
        const target = readCellEditTarget(cell);
        return target !== undefined
          && this.activeEdit?.session.rowKey === target.rowKey
          && this.activeEdit.session.field === target.field;
      }
    };
  }

  private startEditFromCell(
    cell: HTMLElement,
    trigger: EditTrigger,
    initialValue?: string
  ): boolean {
    if (this.destroyed || this.options.editing?.enabled === false) {
      return false;
    }

    const target = readCellEditTarget(cell);
    if (!target) {
      return false;
    }

    const resolved = this.resolveEditableCell(target.rowKey, target.field, target.sourceIndex);
    if (!resolved) {
      return false;
    }

    if (this.activeEdit) {
      this.cancelActiveEdit("replace");
    }
    const session = startCellEdit({
      row: resolved.row,
      rowIndex: target.rowIndex,
      rowKey: resolved.rowKey,
      column: resolved.column.source,
      field: resolved.column.field,
      currentValue: resolved.value,
      ...(this.options.locale === undefined ? {} : { locale: this.options.locale }),
      ...(this.options.editing === undefined ? {} : { editing: this.options.editing })
    });
    if (!session) {
      return false;
    }

    this.emitCellEditStarted(session);
    const overlay = openCellEditor({
      cell,
      session,
      ...(initialValue === undefined ? {} : { initialValue }),
      blurAction: resolveEditBlurAction(this.options.editing),
      commit: (rawValue, validate, trigger) => this.commitActiveEdit(rawValue, validate, trigger),
      cancel: (reason) => {
        this.cancelActiveEdit(reason);
      }
    });
    this.activeEdit = { session, overlay };
    cell.dataset.editing = trigger;
    return true;
  }

  private async commitActiveEdit(
    rawValue: unknown,
    validate: boolean,
    trigger: EditCommitTrigger
  ): Promise<CellEditCommitResult<TData>> {
    const active = this.activeEdit;
    if (!active) {
      throw new Error("No active OneGrid edit session.");
    }

    const result = await commitCellEdit({
      session: active.session,
      rawValue,
      validate,
      ...(this.options.locale === undefined ? {} : { locale: this.options.locale }),
      ...(this.options.editing === undefined ? {} : { editing: this.options.editing })
    });
    if (!result.valid) {
      this.emitCellValidationFailed(result);
      return result;
    }

    if (this.getEditCommitMode() === "batch") {
      this.stageCommittedRow(result, trigger);
      this.activeEdit = undefined;
      active.overlay.destroy();
      await this.render(invalidate(["rows", "layout"], "cell-edit-stage"));
      return result;
    }

    this.applyCommittedRow(result.session, result.nextRow);
    this.activeEdit = undefined;
    active.overlay.destroy();
    this.emitCellEditCommitted(result, trigger);
    await this.render(invalidate(["rows", "layout"], "cell-edit-commit"));
    return result;
  }

  protected stageCommittedRow(
    result: CellEditCommitResult<TData>,
    trigger: EditCommitTrigger
  ): void {
    if (!result.valid) {
      return;
    }

    const field = result.session.field;
    const originalRow = this.editBatch.ensureOriginalRow(
      result.session,
      (rowKey) => this.findEditableRow(rowKey, undefined)
    );
    const column = this.findDataColumn(field);
    const previousValue = readColumnValue(originalRow.row, originalRow.rowIndex, originalRow.rowKey, column)
      ?? result.previousValue;

    this.replaceStoredRow(result.session.rowKey, originalRow.sourceIndex, result.nextRow);

    const pendingEdit = this.editBatch.stage(result, { originalRow, previousValue });
    this.emitCellEditStaged(pendingEdit, trigger);
  }

  protected getEditCommitMode(): EditCommitMode {
    return resolveEditCommitMode(this.options.editing);
  }

  private cancelActiveEdit(reason: EditCancelReason): void {
    const active = this.activeEdit;
    if (!active) {
      return;
    }
    this.activeEdit = undefined;
    active.overlay.destroy();
    this.emitCellEditCancelled(active.session, reason);
  }
}

function resolveEditBlurAction(editing: GridOptions["editing"]): EditBlurAction {
  if (editing?.blurAction) {
    return editing.blurAction;
  }

  return editing?.commitOnBlur === false ? "cancel" : "commit";
}

function resolveEditCommitMode(editing: GridOptions["editing"]): EditCommitMode {
  return editing?.commitMode ?? "cell";
}
