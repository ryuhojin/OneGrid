import type {
  CommitPendingEditsOptions,
  GridBatchEditSession,
  GridEditHistoryEntry,
  GridEditHistoryState,
  GridPendingEdit,
  StartBatchEditSessionOptions
} from "@onegrid/core";
import { OneGridEditStore } from "./oneGridEditStore.js";
import { invalidate } from "./renderInvalidation.js";

export abstract class OneGridBatchEditing<TData = unknown> extends OneGridEditStore<TData> {
  startBatchEditSession(options?: StartBatchEditSessionOptions): GridBatchEditSession<TData> {
    const existing = this.editBatch.getSession();
    const session = this.editBatch.startSession(options);
    if (!existing) {
      this.emitBatchEditSessionStarted(session);
    }
    return session;
  }

  getBatchEditSession(): GridBatchEditSession<TData> | undefined {
    return this.editBatch.getSession();
  }

  async commitBatchEditSession(
    options?: CommitPendingEditsOptions
  ): Promise<GridBatchEditSession<TData> | undefined> {
    return this.commitBatchEdits(options);
  }

  cancelBatchEditSession(): GridBatchEditSession<TData> | undefined {
    return this.cancelBatchEdits();
  }

  undoEdit(): GridEditHistoryEntry<TData> | undefined {
    return this.applyEditHistory("undo");
  }

  redoEdit(): GridEditHistoryEntry<TData> | undefined {
    return this.applyEditHistory("redo");
  }

  getEditHistoryState(): GridEditHistoryState<TData> {
    return this.editHistory.getState();
  }

  clearEditHistory(): void {
    this.editHistory.clear();
    this.emitEditHistoryChanged("clear");
  }

  getPendingEdits(): readonly GridPendingEdit<TData>[] {
    return this.editBatch.getPendingEdits();
  }

  async commitPendingEdits(options?: CommitPendingEditsOptions): Promise<void> {
    await this.commitBatchEdits(options);
  }

  cancelPendingEdits(): void {
    this.cancelBatchEdits();
  }

  protected ensureBatchEditSession(): void {
    if (this.editBatch.getSession()) {
      return;
    }
    this.emitBatchEditSessionStarted(this.editBatch.ensureSession());
  }

  private async commitBatchEdits(
    options?: CommitPendingEditsOptions
  ): Promise<GridBatchEditSession<TData> | undefined> {
    if (this.destroyed) {
      return undefined;
    }

    const active = this.activeEdit;
    if (active) {
      const committed = await active.overlay.commit(options?.validate ?? true, "api");
      if (!committed) {
        return this.editBatch.getSession();
      }
    }

    const session = this.editBatch.closeSession("committed");
    if (this.editBatch.size === 0) {
      if (session) {
        this.emitBatchEditSessionCommitted(session);
      }
      return session;
    }

    const edits = this.editBatch.getEdits();
    this.editBatch.clear();
    for (const edit of edits) {
      this.emitPendingEditCommitted(edit, "api");
    }
    if (session) {
      this.emitBatchEditSessionCommitted(session);
    }
    await this.render(invalidate(["rows", "layout"], "cell-edit-batch-commit"));
    return session;
  }

  private cancelBatchEdits(): GridBatchEditSession<TData> | undefined {
    if (this.destroyed) {
      return undefined;
    }

    if (this.activeEdit) {
      this.cancelActiveEdit("api");
    }

    const session = this.editBatch.closeSession("cancelled");
    if (this.editBatch.size === 0) {
      if (session) {
        this.emitBatchEditSessionCancelled(session);
        this.clearEditHistory();
      }
      return session;
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
    if (session) {
      this.emitBatchEditSessionCancelled(session);
    }
    this.clearEditHistory();
    void this.render(invalidate(["rows", "layout"], "cell-edit-batch-cancel"));
    return session;
  }

  private applyEditHistory(action: "undo" | "redo"): GridEditHistoryEntry<TData> | undefined {
    if (this.destroyed || !this.isEditUndoRedoEnabled()) {
      return undefined;
    }

    if (this.activeEdit) {
      this.cancelActiveEdit("api");
    }

    const entry = action === "undo" ? this.editHistory.undo() : this.editHistory.redo();
    if (!entry) {
      return undefined;
    }

    const row = action === "undo" ? entry.rowBefore : entry.rowAfter;
    const value = action === "undo" ? entry.previousValue : entry.nextValue;
    this.replaceStoredRow(entry.rowKey, entry.sourceIndex, row);
    if (this.editBatch.getSession() || this.editBatch.size > 0) {
      this.editBatch.syncHistoryEntry(entry, { row, value });
    }

    if (action === "undo") {
      this.emitEditUndo(entry);
    } else {
      this.emitEditRedo(entry);
    }
    this.emitEditHistoryChanged(action, entry);
    void this.render(invalidate(["rows", "layout"], `cell-edit-${action}`));
    return entry;
  }

  protected isEditUndoRedoEnabled(): boolean {
    const option = this.options.editing?.undoRedo;
    return option === undefined
      || option === true
      || (typeof option === "object" && option.enabled !== false);
  }
}
