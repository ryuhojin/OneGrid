import { describe, expect, it } from "vitest";
import type { CellEditCommitResult } from "@onegrid/core";
import { EditHistoryRuntime } from "../src/grid/editHistoryRuntime.js";

interface Row {
  readonly id: string;
  readonly title: string;
}

describe("EditHistoryRuntime", () => {
  it("tracks undo and redo stacks with row snapshots", () => {
    const history = new EditHistoryRuntime<Row>();
    const entry = history.push({ result: createResult("Draft", "Approved") }, 100);

    expect(entry?.previousValue).toBe("Draft");
    expect(entry?.nextValue).toBe("Approved");
    expect(history.getState()).toMatchObject({ canUndo: true, canRedo: false, undoCount: 1, redoCount: 0 });

    expect(history.undo()?.rowBefore).toMatchObject({ title: "Draft" });
    expect(history.getState()).toMatchObject({ canUndo: false, canRedo: true, undoCount: 0, redoCount: 1 });

    expect(history.redo()?.rowAfter).toMatchObject({ title: "Approved" });
    expect(history.getState()).toMatchObject({ canUndo: true, canRedo: false, undoCount: 1, redoCount: 0 });
  });

  it("drops oldest undo entries when the configured limit is exceeded", () => {
    const history = new EditHistoryRuntime<Row>();
    history.push({ result: createResult("A", "B") }, 1);
    history.push({ result: createResult("B", "C") }, 1);

    expect(history.getState()).toMatchObject({ undoCount: 1 });
    expect(history.undo()?.previousValue).toBe("B");
  });
});

function createResult(previousValue: string, nextValue: string): CellEditCommitResult<Row> {
  return {
    valid: true,
    issues: [],
    previousValue,
    nextValue,
    nextRow: { id: "ED-1", title: nextValue },
    session: {
      id: "edit-session",
      row: { id: "ED-1", title: previousValue },
      rowIndex: 0,
      rowKey: "ED-1",
      column: { field: "title", editable: true },
      columnId: "title",
      field: "title",
      previousValue,
      editor: { kind: "text", options: [] },
      startedAt: 1,
      locale: "en-US"
    }
  };
}
