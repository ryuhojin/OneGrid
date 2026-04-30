import type { ExecutedCommand, GridCommand } from "./commandBus.js";
import type { GridState } from "../state/index.js";

export interface UndoRedoHistory<TData = unknown> {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  push(entry: ExecutedCommand<TData>): void;
  undo(commandResolver: CommandResolver<TData>): HistoryTransition<TData> | undefined;
  redo(): HistoryTransition<TData> | undefined;
  clear(): void;
}

export interface HistoryTransition<TData = unknown> {
  readonly previous: GridState<TData>;
  readonly next: GridState<TData>;
  readonly label: string;
}

export type CommandResolver<TData = unknown> = (
  commandId: string
) => GridCommand<TData, unknown> | undefined;

export function createUndoRedoHistory<TData = unknown>(): UndoRedoHistory<TData> {
  const undoStack: ExecutedCommand<TData>[] = [];
  const redoStack: ExecutedCommand<TData>[] = [];

  return {
    get canUndo() {
      return undoStack.length > 0;
    },
    get canRedo() {
      return redoStack.length > 0;
    },
    push(entry) {
      if (!entry.reversible) {
        return;
      }

      undoStack.push(entry);
      redoStack.length = 0;
    },
    undo(commandResolver) {
      const entry = undoStack.pop();
      if (!entry) {
        return undefined;
      }

      const command = commandResolver(entry.id);
      const next = command?.undo
        ? command.undo({ state: entry.next }, entry)
        : entry.previous;

      redoStack.push(entry);

      return {
        previous: entry.next,
        next,
        label: `undo:${entry.label}`
      };
    },
    redo() {
      const entry = redoStack.pop();
      if (!entry) {
        return undefined;
      }

      undoStack.push(entry);

      return {
        previous: entry.previous,
        next: entry.next,
        label: `redo:${entry.label}`
      };
    },
    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
    }
  };
}
