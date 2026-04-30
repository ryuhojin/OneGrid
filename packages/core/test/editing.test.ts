import { describe, expect, it } from "vitest";
import { commitCellEdit, isCellEditable, resolveEditorDef, startCellEdit } from "../src/index.js";
import type { CellContext, ColumnDef, DataColumnDef } from "../src/index.js";

interface EditRow {
  readonly id: string;
  readonly title: string;
  readonly amount: number;
  readonly active: boolean;
  readonly status: string;
  readonly tags: readonly string[];
}

const row: EditRow = {
  id: "ED-1",
  title: "Budget draft",
  amount: 10,
  active: false,
  status: "Draft",
  tags: ["ops"]
};

describe("editing lifecycle", () => {
  it("starts only editable columns and resolves default editor kinds", () => {
    const textColumn = createColumn({ field: "title", editable: true });
    const readonlyColumn = createColumn({ field: "id" });
    const context = createContext(textColumn, "Budget draft");

    expect(isCellEditable(textColumn, context, undefined)).toBe(true);
    expect(isCellEditable(readonlyColumn, createContext(readonlyColumn, "ED-1"), undefined))
      .toBe(false);
    expect(resolveEditorDef({ field: "amount", editable: true, type: "number" }).kind)
      .toBe("number");
    expect(resolveEditorDef({ field: "active", editable: true, type: "boolean" }).kind)
      .toBe("checkbox");
  });

  it("commits text, number, checkbox, select, multi-select, and radio editors", async () => {
    await expectCommit({ field: "title", editable: true, editor: "text" }, "Approved", "Approved");
    await expectCommit({ field: "amount", editable: true, type: "number" }, "25", 25);
    await expectCommit({ field: "active", editable: true, editor: "checkbox" }, true, true);
    await expectCommit({ field: "status", editable: true, editor: "select" }, "Approved", "Approved");
    await expectCommit({ field: "tags", editable: true, editor: "multi-select" }, ["ops", "risk"], ["ops", "risk"]);
    await expectCommit({ field: "status", editable: true, editor: "radio" }, "Review", "Review");
  });

  it("commits date, datetime, textarea, autocomplete, and custom editors", async () => {
    await expectCommit({ field: "title", editable: true, editor: "date" }, "2026-05-01", "2026-05-01");
    await expectCommit(
      { field: "title", editable: true, editor: "datetime" },
      "2026-05-01T09:30",
      "2026-05-01T09:30"
    );
    await expectCommit({ field: "title", editable: true, editor: "textarea" }, "Line 1\nLine 2", "Line 1\nLine 2");
    await expectCommit({ field: "title", editable: true, editor: "autocomplete" }, "Han", "Han");
    await expectCommit({
      field: "status",
      editable: true,
      editor: "custom",
      parser: (value) => `custom:${String(value)}`
    }, "A", "custom:A");
  });

  it("runs sync and async validators before applying a row update", async () => {
    const syncColumn = createColumn({
      field: "title",
      editable: true,
      validator: (value) => String(value).length < 3 ? ["Title is too short"] : []
    });
    const asyncColumn = createColumn({
      field: "status",
      editable: true,
      editor: {
        kind: "select",
        validate: async (value) => String(value) === "Blocked" ? ["Blocked requires approval"] : []
      }
    });

    await expectInvalid(syncColumn, "No", "Title is too short");
    await expectInvalid(asyncColumn, "Blocked", "Blocked requires approval");
  });

  it("uses valueSetter when a column owns custom write semantics", async () => {
    const column = createColumn({
      field: "amount",
      editable: true,
      editor: "number",
      valueSetter: (context, nextValue) => ({
        ...context.row,
        amount: Number(nextValue) * 100
      })
    });

    const session = startCellEdit({ row, rowIndex: 0, rowKey: row.id, column });
    expect(session).toBeDefined();
    if (!session) {
      throw new Error("Expected editable session.");
    }
    const result = await commitCellEdit({ session, rawValue: "3" });

    expect(result.valid).toBe(true);
    expect(result.nextRow.amount).toBe(300);
  });
});

async function expectCommit(
  column: DataColumnDef<EditRow>,
  rawValue: unknown,
  expectedValue: unknown
): Promise<void> {
  const session = startCellEdit({ row, rowIndex: 0, rowKey: row.id, column });
  expect(session).toBeDefined();
  if (!session) {
    throw new Error("Expected editable session.");
  }

  const result = await commitCellEdit({ session, rawValue });
  expect(result.valid).toBe(true);
  expect(result.nextValue).toEqual(expectedValue);
  expect(result.nextRow).toMatchObject({ [column.field]: expectedValue });
}

async function expectInvalid(
  column: DataColumnDef<EditRow>,
  rawValue: unknown,
  message: string
): Promise<void> {
  const session = startCellEdit({ row, rowIndex: 0, rowKey: row.id, column });
  expect(session).toBeDefined();
  if (!session) {
    throw new Error("Expected editable session.");
  }

  const result = await commitCellEdit({ session, rawValue });
  expect(result.valid).toBe(false);
  expect(result.nextRow).toBe(row);
  expect(result.issues.map((issue) => issue.message)).toContain(message);
}

function createColumn(column: DataColumnDef<EditRow>): DataColumnDef<EditRow> {
  return column;
}

function createContext(column: ColumnDef<EditRow>, value: unknown): CellContext<EditRow> {
  if ("children" in column) {
    throw new Error("Test context requires a data column.");
  }

  return {
    row,
    rowIndex: 0,
    rowKey: row.id,
    column,
    field: column.field,
    value,
    position: { rowIndex: 0, field: column.field, rowKey: row.id }
  };
}
