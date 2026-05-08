import { describe, expect, it } from "vitest";
import {
  createClientRowModel,
  normalizeFilterModel,
  setColumnFilterConditions,
  setQuickFilterText
} from "../src/index.js";
import type { ColumnDef, FilterModel } from "../src/index.js";

interface FilterTestRow {
  readonly id: string;
  readonly agency: string;
  readonly service: string;
  readonly amount: number;
  readonly dueDate: string;
  readonly urgent: boolean;
  readonly status: "Approved" | "Review" | "Blocked";
}

const rows: readonly FilterTestRow[] = [
  {
    id: "F-1",
    agency: "Treasury Office",
    service: "Budget approval",
    amount: 1200000,
    dueDate: "2026-05-01",
    urgent: false,
    status: "Approved"
  },
  {
    id: "F-2",
    agency: "Audit Bureau",
    service: "Risk sampling",
    amount: 430000,
    dueDate: "2026-05-10",
    urgent: true,
    status: "Review"
  },
  {
    id: "F-3",
    agency: "Records Office",
    service: "Cloud migration",
    amount: 920000,
    dueDate: "2026-04-20",
    urgent: true,
    status: "Blocked"
  },
  {
    id: "F-4",
    agency: "Health Office",
    service: "Clinic staffing",
    amount: 640000,
    dueDate: "2026-06-01",
    urgent: false,
    status: "Approved"
  }
];

const columns: readonly ColumnDef<FilterTestRow>[] = [
  { field: "id", headerName: "ID", filter: "text" },
  { field: "agency", headerName: "Agency", filter: "text" },
  {
    field: "service",
    headerName: "Service",
    filter: {
      kind: "custom",
      predicate: ({ value, filterValue }) =>
        String(value).toLocaleLowerCase().includes(String(filterValue).toLocaleLowerCase())
    }
  },
  { field: "amount", headerName: "Amount", type: "number", filter: "number" },
  { field: "dueDate", headerName: "Due", type: "date", filter: "date" },
  { field: "urgent", headerName: "Urgent", type: "boolean", filter: "boolean" },
  { field: "status", headerName: "Status", filter: "set" },
  {
    columnId: "risk",
    headerName: "Risk",
    valueGetter: ({ row }) => `${row.status} ${row.urgent ? "urgent" : "normal"}`
  }
];

describe("filtering", () => {
  it("normalizes empty conditions and quick text", () => {
    expect(normalizeFilterModel({
      quickText: "  ",
      conditions: [
        { field: "agency", kind: "text", operator: "contains", value: "" },
        { field: "urgent", kind: "boolean", operator: "equals", value: false }
      ]
    })).toEqual({
      conditions: [{ field: "urgent", kind: "boolean", operator: "equals", value: false }]
    });
  });

  it("applies text, number, date, boolean, set, and custom filters", () => {
    const model: FilterModel = {
      conditions: [
        { field: "agency", kind: "text", operator: "contains", value: "office" },
        { field: "amount", kind: "number", operator: ">=", value: 600000 },
        { field: "amount", kind: "number", operator: "<=", value: 1300000 },
        { field: "dueDate", kind: "date", operator: ">", value: "2026-04-30" },
        { field: "urgent", kind: "boolean", operator: "equals", value: false },
        { field: "status", kind: "set", operator: "in", value: ["Approved"] },
        { field: "service", kind: "custom", operator: "custom", value: "staff" }
      ]
    };

    const rowModel = createClientRowModel(rows, { columns, rowKey: "id", filterModel: model });

    expect(rowModel.filteredRows.map((row) => row.key)).toEqual(["F-4"]);
  });

  it("applies quick filter across value getters", () => {
    const rowModel = createClientRowModel(rows, {
      columns,
      rowKey: "id",
      filterModel: setQuickFilterText(undefined, "urgent")
    });

    expect(rowModel.filteredRows.map((row) => row.key)).toEqual(["F-2", "F-3"]);
  });

  it("replaces a column filter without removing quick filter", () => {
    const model = setQuickFilterText(undefined, "office");
    const next = setColumnFilterConditions(model, "status", [
      { field: "status", kind: "set", operator: "in", value: ["Approved"] }
    ]);
    const rowModel = createClientRowModel(rows, { columns, rowKey: "id", filterModel: next });

    expect(next.quickText).toBe("office");
    expect(rowModel.filteredRows.map((row) => row.key)).toEqual(["F-1", "F-4"]);
  });
});
