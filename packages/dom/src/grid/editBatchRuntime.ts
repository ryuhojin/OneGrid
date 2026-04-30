import type {
  CellEditCommitResult,
  CellEditSession,
  GridPendingEdit,
  NormalizedDataColumn,
  RowKey
} from "@onegrid/core";
import { readField } from "@onegrid/core";

export interface PendingDomEdit<TData> extends GridPendingEdit<TData> {
  readonly field: string;
  readonly rowIndex: number;
  readonly sourceIndex?: number;
}

export interface PendingOriginalRow<TData> {
  readonly row: TData;
  readonly rowKey: RowKey;
  readonly rowIndex: number;
  readonly sourceIndex?: number;
}

interface PendingSourceRow<TData> {
  readonly row: TData;
  readonly rowIndex: number;
  readonly sourceIndex?: number;
}

export class EditBatchRuntime<TData> {
  private readonly pendingEdits = new Map<string, PendingDomEdit<TData>>();
  private readonly pendingOriginalRows = new Map<string, PendingOriginalRow<TData>>();

  get size(): number {
    return this.pendingEdits.size;
  }

  getPendingEdits(): readonly GridPendingEdit<TData>[] {
    return Object.freeze([...this.pendingEdits.values()].map((edit) => Object.freeze({
      row: edit.row,
      rowKey: edit.rowKey,
      position: edit.position,
      ...(edit.sourceIndex === undefined ? {} : { sourceIndex: edit.sourceIndex }),
      previousValue: edit.previousValue,
      nextValue: edit.nextValue,
      stagedAt: edit.stagedAt
    })));
  }

  getEdits(): readonly PendingDomEdit<TData>[] {
    return Object.freeze([...this.pendingEdits.values()]);
  }

  getOriginalRows(): readonly PendingOriginalRow<TData>[] {
    return Object.freeze([...this.pendingOriginalRows.values()]);
  }

  getOriginalRow(rowKey: RowKey): PendingOriginalRow<TData> | undefined {
    return this.pendingOriginalRows.get(String(rowKey));
  }

  clear(): void {
    this.pendingEdits.clear();
    this.pendingOriginalRows.clear();
  }

  ensureOriginalRow(
    session: CellEditSession<TData>,
    resolveRow: (rowKey: string) => PendingSourceRow<TData> | undefined
  ): PendingOriginalRow<TData> {
    const rowKeyId = String(session.rowKey);
    const existing = this.pendingOriginalRows.get(rowKeyId);
    if (existing) {
      return existing;
    }

    const resolved = resolveRow(rowKeyId);
    const original = Object.freeze({
      row: resolved?.row ?? session.row,
      rowKey: session.rowKey,
      rowIndex: resolved?.rowIndex ?? session.rowIndex,
      ...(resolved?.sourceIndex === undefined ? {} : { sourceIndex: resolved.sourceIndex })
    });
    this.pendingOriginalRows.set(rowKeyId, original);
    return original;
  }

  stage(
    result: CellEditCommitResult<TData>,
    input: {
      readonly originalRow: PendingOriginalRow<TData>;
      readonly previousValue: unknown;
    }
  ): PendingDomEdit<TData> {
    const rowKey = result.session.rowKey;
    const field = result.session.field;
    const editKey = createPendingEditKey(rowKey, field);
    const previousValue = this.pendingEdits.get(editKey)?.previousValue ?? input.previousValue;
    const pendingEdit: PendingDomEdit<TData> = Object.freeze({
      row: result.nextRow,
      rowKey,
      position: {
        rowIndex: result.session.rowIndex,
        rowKey,
        field
      },
      previousValue,
      nextValue: result.nextValue,
      stagedAt: Date.now(),
      field,
      rowIndex: result.session.rowIndex,
      ...(input.originalRow.sourceIndex === undefined
        ? {}
        : { sourceIndex: input.originalRow.sourceIndex })
    });

    if (Object.is(previousValue, result.nextValue)) {
      this.pendingEdits.delete(editKey);
      if (!this.hasPendingEditsForRow(String(rowKey))) {
        this.pendingOriginalRows.delete(String(rowKey));
      }
    } else {
      this.pendingEdits.set(editKey, pendingEdit);
    }

    return pendingEdit;
  }

  private hasPendingEditsForRow(rowKeyId: string): boolean {
    for (const edit of this.pendingEdits.values()) {
      if (String(edit.rowKey) === rowKeyId) {
        return true;
      }
    }
    return false;
  }
}

export function readColumnValue<TData>(
  row: TData,
  rowIndex: number,
  rowKey: RowKey,
  column: NormalizedDataColumn<TData> | undefined
): unknown {
  if (!column) {
    return undefined;
  }
  return column.source.valueGetter
    ? column.source.valueGetter({ row, rowIndex, rowKey })
    : readField(row, column.field);
}

function createPendingEditKey(rowKey: RowKey, field: string): string {
  return `${String(rowKey)}\u0000${field}`;
}
