import { describe, expect, it, vi } from "vitest";
import {
  createCommandBus,
  createEventBus,
  createGridStateStore,
  createInitialGridState,
  createUndoRedoHistory,
  nextGridState
} from "../src/index.js";
import type { GridCommand, GridEventMap, GridState } from "../src/index.js";

interface OrderRow {
  readonly id: string;
  readonly amount: number;
}

describe("core state foundation", () => {
  it("creates frozen immutable state and records transactions", () => {
    const initial = createInitialGridState<OrderRow>({
      rows: [{ id: "ORD-001", amount: 100 }],
      columns: [{ field: "id" }]
    });
    const store = createGridStateStore(initial);
    const listener = vi.fn();

    store.subscribe(listener);
    const transaction = store.transact("set-loading", (state) =>
      nextGridState(state, { status: { loading: true } })
    );

    expect(Object.isFrozen(store.getState())).toBe(true);
    expect(transaction.previous.version).toBe(0);
    expect(transaction.next.version).toBe(1);
    expect(transaction.next.status.loading).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify listeners for no-op transactions", () => {
    const state = createInitialGridState<OrderRow>();
    const store = createGridStateStore(state);
    const listener = vi.fn();

    store.subscribe(listener);
    const transaction = store.transact("noop", (current) => current);

    expect(transaction.changed).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("core event bus foundation", () => {
  it("emits typed events and supports once listeners", () => {
    const bus = createEventBus<GridEventMap<OrderRow>>();
    const handler = vi.fn();

    bus.once("ready", handler);
    bus.emit("ready", { type: "ready" });
    bus.emit("ready", { type: "ready" });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("supports cancellable before-events", () => {
    const bus = createEventBus<GridEventMap<OrderRow>>();
    const laterHandler = vi.fn();

    bus.onBefore("cellEditStarted", (event) => {
      event.preventDefault("read-only");
    });
    bus.onBefore("cellEditStarted", laterHandler);

    const result = bus.emitBefore("cellEditStarted", {
      type: "cellEditStarted",
      row: { id: "ORD-001", amount: 100 },
      rowKey: "ORD-001",
      position: { rowIndex: 0, field: "amount", rowKey: "ORD-001" },
      value: 100
    });

    expect(result.defaultPrevented).toBe(true);
    expect(result.reason).toBe("read-only");
    expect(laterHandler).not.toHaveBeenCalled();
  });
});

describe("core command bus and undo/redo foundation", () => {
  it("executes registered commands and restores reversible state", () => {
    const commandBus = createCommandBus<OrderRow>();
    const history = createUndoRedoHistory<OrderRow>();
    const initial = createInitialGridState<OrderRow>();
    const appendRowsCommand: GridCommand<OrderRow, readonly OrderRow[]> = {
      id: "rows.append",
      execute(_context, rows) {
        return {
          label: "append rows",
          update(state) {
            return nextGridState(state, { rows: [...state.rows, ...rows] });
          }
        };
      },
      undo(_context, entry) {
        return entry.previous;
      }
    };

    commandBus.register(appendRowsCommand);
    const executed = commandBus.execute(
      "rows.append",
      [{ id: "ORD-001", amount: 100 }],
      { state: initial }
    );

    history.push(executed);

    expect(executed.next.rows).toHaveLength(1);
    expect(history.canUndo).toBe(true);

    const undo = history.undo((id) => commandBus.get(id));
    expect(undo?.next.rows).toHaveLength(0);
    expect(history.canRedo).toBe(true);

    const redo = history.redo();
    expect(redo?.next.rows).toHaveLength(1);
  });

  it("rejects duplicate command ids", () => {
    const commandBus = createCommandBus<OrderRow>();
    const command: GridCommand<OrderRow, undefined> = {
      id: "duplicate",
      execute(context) {
        return {
          update(): GridState<OrderRow> {
            return context.state;
          }
        };
      }
    };

    commandBus.register(command);

    expect(() => commandBus.register(command)).toThrow("Command is already registered");
  });
});
