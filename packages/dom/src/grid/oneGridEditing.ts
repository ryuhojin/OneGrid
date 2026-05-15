import { commitCellEdit, resolveEditKeyboardPolicy, startCellEdit } from "@onegrid/core";
import type {
  CellEditCommitResult,
  CellEditSession,
  CellPosition,
  EditBlurAction,
  EditCommitTrigger,
  GridOptions,
  ScrollAlign
} from "@onegrid/core";
import {
  isCellVisibleInViewport,
  isMatchingEditCell
} from "./editCellVisibility.js";
import { revealEditCell, scrollEditPositionIntoView } from "./editCellReveal.js";
import { moveEditFocusAfterCommit } from "./editFocusMove.js";
import { readCellEditTarget, type CellEditTarget, type EditTrigger, type GridEditRuntime, type GridStopEditOptions } from "./editRuntime.js";
import { openCellEditor } from "./editorOverlay.js";
import { OneGridEditCommitBase } from "./oneGridEditCommitBase.js";
import { invalidate } from "./renderInvalidation.js";
import type { GridScrollLayoutState } from "./scrollCoordinator.js";
import { getGridScrollCoordinator } from "./scrollCoordinator.js";

export class OneGridEditing<TData = unknown> extends OneGridEditCommitBase<TData> {
  startEdit(position: CellPosition): void {
    const resolvedPosition = this.resolveMergedEditPosition(position);
    scrollEditPositionIntoView(resolvedPosition, this.createEditRevealRuntime());
    const cell = this.findCellElement(resolvedPosition);
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

  protected createEditRuntime(): GridEditRuntime {
    return {
      startEditFromCell: (cell, trigger, initialValue) => this.startEditFromCell(cell, trigger, initialValue),
      toggleCheckboxCell: (cell, trigger) => this.toggleCheckboxCell(cell, trigger),
      syncActiveEditOnScroll: (viewport, state) => this.syncActiveEditOnScroll(viewport, state),
      stopEdit: (options) => this.stopEdit(options),
      isEditingCell: (cell) => {
        const target = readCellEditTarget(cell);
        return target !== undefined
          && this.activeEdit?.session.rowKey === target.rowKey
          && this.activeEdit.session.field === target.field;
      }
    };
  }

  private toggleCheckboxCell(cell: HTMLElement, trigger: "pointer"): boolean {
    if (
      this.destroyed
      || this.options.editing?.enabled === false
      || cell.dataset.editorKind !== "checkbox"
    ) {
      return false;
    }

    let target = readCellEditTarget(cell);
    if (!target) {
      return false;
    }

    cell = this.revealEditCell(cell, target);
    target = readCellEditTarget(cell);
    if (!target) {
      return false;
    }

    const resolved = this.resolveEditableCell(
      target.rowKey,
      target.field,
      target.sourceIndex,
      target.columnId
    );
    if (!resolved) {
      return false;
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
    if (!session || session.editor.kind !== "checkbox") {
      return false;
    }

    if (!this.canStartCellEdit(session, trigger)) {
      return false;
    }
    if (this.activeEdit) {
      this.cancelActiveEdit("replace");
    }

    this.emitCellEditStarted(session);
    void this.commitPreparedEdit(session, resolved.value !== true, true, trigger);
    return true;
  }

  private startEditFromCell(
    cell: HTMLElement,
    trigger: EditTrigger,
    initialValue?: string
  ): boolean {
    if (this.destroyed || this.options.editing?.enabled === false) {
      return false;
    }

    let target = readCellEditTarget(cell);
    if (!target) {
      return false;
    }

    cell = this.revealEditCell(cell, target);
    target = readCellEditTarget(cell);
    if (!target) {
      return false;
    }

    const resolved = this.resolveEditableCell(
      target.rowKey,
      target.field,
      target.sourceIndex,
      target.columnId
    );
    if (!resolved) {
      return false;
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

    if (!this.canStartCellEdit(session, trigger)) {
      return false;
    }
    if (this.activeEdit) {
      this.cancelActiveEdit("replace");
    }

    this.emitCellEditStarted(session);
    const overlay = openCellEditor({
      cell,
      session,
      ...(initialValue === undefined ? {} : { initialValue }),
      blurAction: resolveEditBlurAction(this.options.editing),
      keyboardPolicy: resolveEditKeyboardPolicy(this.options.editing),
      commit: (rawValue, validate, trigger) => this.commitActiveEdit(rawValue, validate, trigger),
      cancel: (reason) => {
        this.cancelActiveEdit(reason);
      },
      moveAfterCommit: (direction) => moveEditFocusAfterCommit(this.root, cell, direction)
    });
    this.activeEdit = { session, overlay, cell };
    cell.dataset.editing = trigger;
    return true;
  }

  private syncActiveEditOnScroll(
    viewport: HTMLElement,
    _scrollState?: GridScrollLayoutState
  ): void {
    void _scrollState;
    const active = this.activeEdit;
    if (!active) {
      return;
    }

    const cell = this.findActiveEditCell(active.cell);
    if (!cell || !isCellVisibleInViewport(cell, viewport)) {
      this.settleActiveEditAfterScroll();
      return;
    }

    active.overlay.reposition(cell);
    if (cell !== active.cell) {
      this.activeEdit = { ...active, cell };
    }
  }

  private revealEditCell(cell: HTMLElement, target: CellEditTarget): HTMLElement {
    return revealEditCell(cell, target, this.createEditRevealRuntime());
  }

  private createEditRevealRuntime() {
    const scrollCoordinator = getGridScrollCoordinator(this.root);
    return {
      root: this.root,
      findCellElement: (position: CellPosition) => this.findCellElement(position),
      getColumnScrollLeft: () => this.columnScrollLeft,
      setColumnScrollToField: (field: string, align: ScrollAlign) => this.setColumnScrollToField(field, align),
      setColumnViewportWidth: (width: number) => { this.columnViewportWidth = width || this.columnViewportWidth; },
      ...(scrollCoordinator === undefined ? {} : { scrollCoordinator })
    };
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

    if (!this.canCommitCellEdit(result, trigger)) {
      return result;
    }

    if (this.isReadOnlyEdit()) {
      this.activeEdit = undefined;
      active.overlay.destroy();
      this.emitCellEditRequested(result, trigger);
      await this.render(invalidate(["rows", "layout"], "cell-edit-request"));
      return result;
    }

    if (this.getEditCommitMode() === "batch") {
      this.stageCommittedRow(result, trigger);
      this.activeEdit = undefined;
      active.overlay.destroy();
      await this.render(invalidate(["rows", "layout"], "cell-edit-stage"));
      return result;
    }

    const sourceIndex = this.findEditableRow(String(result.session.rowKey), undefined)?.sourceIndex;
    this.applyCommittedRow(result.session, result.nextRow);
    this.pushEditHistory(result, sourceIndex);
    this.activeEdit = undefined;
    active.overlay.destroy();
    this.emitCellEditCommitted(result, trigger);
    await this.render(invalidate(["rows", "layout"], "cell-edit-commit"));
    return result;
  }

  private async commitPreparedEdit(
    session: CellEditSession<TData>,
    rawValue: unknown,
    validate: boolean,
    trigger: EditCommitTrigger
  ): Promise<CellEditCommitResult<TData>> {
    const result = await commitCellEdit({
      session,
      rawValue,
      validate,
      ...(this.options.locale === undefined ? {} : { locale: this.options.locale }),
      ...(this.options.editing === undefined ? {} : { editing: this.options.editing })
    });
    if (!result.valid) {
      this.emitCellValidationFailed(result);
      return result;
    }

    if (!this.canCommitCellEdit(result, trigger)) {
      return result;
    }

    if (this.isReadOnlyEdit()) {
      this.emitCellEditRequested(result, trigger);
      await this.render(invalidate(["rows", "layout"], "cell-edit-checkbox-request"));
      return result;
    }

    if (this.getEditCommitMode() === "batch") {
      this.stageCommittedRow(result, trigger);
      await this.render(invalidate(["rows", "layout"], "cell-edit-checkbox-stage"));
      return result;
    }

    const sourceIndex = this.findEditableRow(String(result.session.rowKey), undefined)?.sourceIndex;
    this.applyCommittedRow(result.session, result.nextRow);
    this.pushEditHistory(result, sourceIndex);
    this.emitCellEditCommitted(result, trigger);
    await this.render(invalidate(["rows", "layout"], "cell-edit-checkbox-commit"));
    return result;
  }

  private findActiveEditCell(currentCell: HTMLElement): HTMLElement | undefined {
    const active = this.activeEdit;
    if (!active) {
      return undefined;
    }

    const rowKey = String(active.session.rowKey);
    const field = active.session.field;
    const columnId = active.session.columnId;
    if (isMatchingEditCell(currentCell, rowKey, field, columnId)) {
      return currentCell;
    }

    return Array.from(this.root.querySelectorAll<HTMLElement>("[data-edit-row-key][data-field]"))
      .find((cell) => isMatchingEditCell(cell, rowKey, field, columnId));
  }

  private settleActiveEditAfterScroll(): void {
    this.cancelActiveEdit("blur");
  }
}

function resolveEditBlurAction(editing: GridOptions["editing"]): EditBlurAction {
  if (editing?.blurAction) {
    return editing.blurAction;
  }

  return editing?.commitOnBlur === false ? "cancel" : "commit";
}
