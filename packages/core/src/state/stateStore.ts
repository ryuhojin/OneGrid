import { freezeGridState } from "./gridState.js";
import type { GridState, GridStateUpdater } from "./gridState.js";

export interface GridStateStore<TData = unknown> {
  getState(): GridState<TData>;
  transact(label: string, updater: GridStateUpdater<TData>): StateTransaction<TData>;
  subscribe(listener: GridStateListener<TData>): () => void;
}

export interface StateTransaction<TData = unknown> {
  readonly label: string;
  readonly previous: GridState<TData>;
  readonly next: GridState<TData>;
  readonly changed: boolean;
}

export type GridStateListener<TData = unknown> = (transaction: StateTransaction<TData>) => void;

export function createGridStateStore<TData>(
  initialState: GridState<TData>
): GridStateStore<TData> {
  let state = freezeGridState(initialState);
  const listeners = new Set<GridStateListener<TData>>();

  return {
    getState() {
      return state;
    },
    transact(label, updater) {
      const previous = state;
      const next = freezeGridState(updater(previous));
      const transaction: StateTransaction<TData> = {
        label,
        previous,
        next,
        changed: previous !== next
      };

      if (transaction.changed) {
        state = next;
        for (const listener of listeners) {
          listener(transaction);
        }
      }

      return transaction;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
