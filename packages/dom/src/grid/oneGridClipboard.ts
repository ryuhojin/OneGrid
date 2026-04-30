import {
  commitCellEdit,
  createClipboardPastePlan,
  startCellEdit
} from "@onegrid/core";
import type {
  CellEditCommitResult,
  ClipboardCopyOptions,
  ClipboardPastePatch,
  EditCommitTrigger,
  SelectedCell
} from "@onegrid/core";
import {
  attachGridClipboardForHost,
  disposeGridClipboard
} from "./clipboardRuntime.js";
import type { GridClipboardRuntime } from "./clipboardRuntime.js";
import {
  createClipboardSnapshot,
  createSelectedClipboardText,
  findClipboardActiveCell,
  isClipboardCellEditable,
  resolveMergedPasteTarget
} from "./clipboardData.js";
import type {
  ClipboardDataRow,
  ClipboardDataSnapshot
} from "./clipboardData.js";
import { readCellValue } from "./rendererHost.js";
import { invalidate } from "./renderInvalidation.js";
import { fullInvalidation } from "./renderInvalidation.js";
import { OneGridEditing } from "./oneGridEditing.js";

export class OneGridClipboard<TData = unknown> extends OneGridEditing<TData> {
  async copyToClipboard(options?: ClipboardCopyOptions): Promise<void> {
    if (!isClipboardEnabled(this.options.clipboard)) {
      return;
    }

    const text = this.createClipboardText(options);
    if (text.length === 0) {
      return;
    }

    await writeClipboardText(text);
  }

  async pasteFromClipboard(text: string): Promise<void> {
    if (!isClipboardEnabled(this.options.clipboard)) {
      return;
    }

    await this.applyClipboardText(text);
  }

  protected override commitRender(invalidation = fullInvalidation("commit")): void {
    super.commitRender(invalidation);
    this.attachClipboardRuntime();
  }

  override destroy(): void {
    disposeGridClipboard(this.root);
    super.destroy();
  }

  private attachClipboardRuntime(): void {
    const grid = this.root.querySelector<HTMLElement>(".og-grid");
    if (!grid || !isClipboardEnabled(this.options.clipboard)) {
      disposeGridClipboard(this.root);
      return;
    }

    attachGridClipboardForHost(this.root, {
      grid,
      runtime: this.createClipboardRuntime()
    });
  }

  private createClipboardRuntime(): GridClipboardRuntime {
    return {
      enabled: isClipboardEnabled(this.options.clipboard),
      copyText: (options) => this.createClipboardText(options),
      pasteText: (text) => this.applyClipboardText(text)
    };
  }

  private createClipboardText(options?: ClipboardCopyOptions): string {
    const renderOptions = this.getRenderOptions();
    const snapshot = createClipboardSnapshot(renderOptions, this.createRowRenderState());
    const activeCell = findClipboardActiveCell(this.root);
    return createSelectedClipboardText({
      snapshot,
      selection: this.selectionState,
      ...(activeCell === undefined ? {} : { activeCell }),
      copyOptions: {
        selectedOnly: true,
        ...(this.options.clipboard?.includeHeaders === undefined
          ? {}
          : { includeHeaders: this.options.clipboard.includeHeaders }),
        ...options
      },
      preserveMerge: this.options.clipboard?.preserveMerge !== false
    });
  }

  private async applyClipboardText(text: string): Promise<void> {
    if (this.destroyed || !isClipboardEnabled(this.options.clipboard) || text.length === 0) {
      return;
    }

    const snapshot = createClipboardSnapshot(this.getRenderOptions(), this.createRowRenderState());
    const anchor = this.getPasteAnchor();
    if (!anchor) {
      return;
    }

    const plan = createClipboardPastePlan({
      text,
      anchorRowIndex: anchor.rowIndex,
      anchorColumnIndex: anchor.columnIndex,
      rowCount: getRowCapacity(snapshot.rows),
      columnCount: snapshot.columns.length,
      isEditable: (rowIndex, columnIndex) => {
        const target = resolveMergedPasteTarget(snapshot, rowIndex, columnIndex);
        const row = findRow(snapshot.rows, target.rowIndex);
        const column = snapshot.columns[target.columnIndex];
        return row !== undefined && column !== undefined
          && isClipboardCellEditable(row, column, this.options.editing);
      }
    });
    const patches = dedupeMergedPastePatches(snapshot, plan.patches);
    let changed = false;
    for (const patch of patches) {
      const committed = await this.applyClipboardPatch(snapshot, patch, "api");
      changed = committed || changed;
    }

    if (changed) {
      await this.render(invalidate(["rows", "layout"], "clipboard-paste"));
    }
  }

  private getPasteAnchor(): SelectedCell | undefined {
    return this.selectionState.cells[0]
      ?? this.selectionState.ranges[0]?.anchor
      ?? this.selectionAnchor
      ?? findClipboardActiveCell(this.root);
  }

  private async applyClipboardPatch(
    snapshot: ClipboardDataSnapshot<TData>,
    patch: ClipboardPastePatch,
    trigger: EditCommitTrigger
  ): Promise<boolean> {
    const row = findRow(snapshot.rows, patch.rowIndex);
    const column = snapshot.columns[patch.columnIndex];
    if (!row || !column) {
      return false;
    }

    const currentRow = this.findEditableRow(String(row.rowKey), row.sourceIndex);
    if (!currentRow) {
      return false;
    }

    const previousValue = readCellValue(currentRow.row, currentRow.rowKey, row.rowIndex, column);
    const session = startCellEdit({
      row: currentRow.row,
      rowIndex: row.rowIndex,
      rowKey: currentRow.rowKey,
      column: column.source,
      field: column.field,
      currentValue: previousValue,
      ...(this.options.editing === undefined ? {} : { editing: this.options.editing })
    });
    if (!session) {
      return false;
    }

    const result = await commitCellEdit({
      session,
      rawValue: patch.rawValue,
      validate: true,
      ...(this.options.editing === undefined ? {} : { editing: this.options.editing })
    });
    return this.applyClipboardCommit(result, trigger);
  }

  private applyClipboardCommit(
    result: CellEditCommitResult<TData>,
    trigger: EditCommitTrigger
  ): boolean {
    if (!result.valid) {
      this.emitCellValidationFailed(result);
      return false;
    }

    if (this.getEditCommitMode() === "batch") {
      this.stageCommittedRow(result, trigger);
      return true;
    }

    this.applyCommittedRow(result.session, result.nextRow);
    this.emitCellEditCommitted(result, trigger);
    return true;
  }
}

function dedupeMergedPastePatches<TData>(
  snapshot: ClipboardDataSnapshot<TData>,
  patches: readonly ClipboardPastePatch[]
): readonly ClipboardPastePatch[] {
  const result = new Map<string, ClipboardPastePatch>();
  for (const patch of patches) {
    const target = resolveMergedPasteTarget(snapshot, patch.rowIndex, patch.columnIndex);
    const key = `${target.rowIndex}:${target.columnIndex}`;
    if (!result.has(key)) {
      result.set(key, {
        rowIndex: target.rowIndex,
        columnIndex: target.columnIndex,
        rawValue: patch.rawValue
      });
    }
  }
  return Object.freeze([...result.values()]);
}

function findRow<TData>(
  rows: readonly ClipboardDataRow<TData>[],
  rowIndex: number
): ClipboardDataRow<TData> | undefined {
  return rows.find((row) => row.rowIndex === rowIndex);
}

function getRowCapacity<TData>(rows: readonly ClipboardDataRow<TData>[]): number {
  return rows.reduce((max, row) => Math.max(max, row.rowIndex + 1), 0);
}

async function writeClipboardText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  }
}

function isClipboardEnabled(clipboard: { readonly enabled?: boolean } | undefined): boolean {
  return clipboard?.enabled === true;
}
