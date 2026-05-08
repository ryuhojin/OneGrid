import type {
  CellEditCommitResult,
  GridEditHistoryEntry,
  GridEditHistoryState
} from "@onegrid/core";

export interface DomEditHistoryEntry<TData> extends GridEditHistoryEntry<TData> {
  readonly field: string;
  readonly rowIndex: number;
  readonly sourceIndex?: number;
}

export interface EditHistoryInput<TData> {
  readonly result: CellEditCommitResult<TData>;
  readonly sourceIndex?: number;
}

let nextEditHistoryId = 0;

export class EditHistoryRuntime<TData> {
  private readonly undoStack: DomEditHistoryEntry<TData>[] = [];
  private readonly redoStack: DomEditHistoryEntry<TData>[] = [];

  push(input: EditHistoryInput<TData>, limit: number): DomEditHistoryEntry<TData> | undefined {
    if (Object.is(input.result.previousValue, input.result.nextValue)) {
      return undefined;
    }

    const entry = Object.freeze({
      id: `edit:${++nextEditHistoryId}`,
      row: input.result.nextRow,
      rowKey: input.result.session.rowKey,
      position: {
        rowIndex: input.result.session.rowIndex,
        rowKey: input.result.session.rowKey,
        columnId: input.result.session.columnId,
        field: input.result.session.field
      },
      ...(input.sourceIndex === undefined ? {} : { sourceIndex: input.sourceIndex }),
      previousValue: input.result.previousValue,
      nextValue: input.result.nextValue,
      rowBefore: input.result.session.row,
      rowAfter: input.result.nextRow,
      createdAt: Date.now(),
      field: input.result.session.field,
      rowIndex: input.result.session.rowIndex
    });

    this.undoStack.push(entry);
    this.redoStack.length = 0;
    this.trimUndoStack(limit);
    return entry;
  }

  undo(): DomEditHistoryEntry<TData> | undefined {
    const entry = this.undoStack.pop();
    if (!entry) {
      return undefined;
    }

    this.redoStack.push(entry);
    return entry;
  }

  redo(): DomEditHistoryEntry<TData> | undefined {
    const entry = this.redoStack.pop();
    if (!entry) {
      return undefined;
    }

    this.undoStack.push(entry);
    return entry;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  getState(): GridEditHistoryState<TData> {
    const lastUndo = this.undoStack.at(-1);
    const lastRedo = this.redoStack.at(-1);
    return Object.freeze({
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      ...(lastUndo === undefined ? {} : { lastUndo }),
      ...(lastRedo === undefined ? {} : { lastRedo })
    });
  }

  private trimUndoStack(limit: number): void {
    const normalizedLimit = normalizeHistoryLimit(limit);
    if (this.undoStack.length <= normalizedLimit) {
      return;
    }

    this.undoStack.splice(0, this.undoStack.length - normalizedLimit);
  }
}

export function normalizeHistoryLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return 100;
  }
  return Math.max(1, Math.min(10_000, Math.floor(limit)));
}
