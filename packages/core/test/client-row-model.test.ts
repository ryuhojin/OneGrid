import { describe, expect, it } from "vitest";
import {
  appendClientRows,
  createClientRowModel,
  removeClientRows,
  setClientRows,
  updateClientRows
} from "../src/index.js";
import type { AggregateModel, FilterModel, GroupModel, SortModel } from "../src/index.js";

interface OrderRow {
  readonly id: string;
  readonly customer: string;
  readonly region: string;
  readonly amount: number;
  readonly status: "Draft" | "Approved" | "Rejected";
}

const rows: readonly OrderRow[] = [
  { id: "ORD-5101", customer: "Treasury", region: "Seoul", amount: 1250, status: "Approved" },
  { id: "ORD-5102", customer: "Harbor", region: "Busan", amount: 910, status: "Approved" },
  { id: "ORD-5103", customer: "Metro", region: "Seoul", amount: 620, status: "Draft" },
  { id: "ORD-5104", customer: "Audit", region: "Incheon", amount: 140, status: "Rejected" }
];

const filterModel: FilterModel = {
  conditions: [{ field: "status", kind: "set", operator: "in", value: ["Approved", "Draft"] }]
};

const sortModel: readonly SortModel[] = [{ field: "amount", direction: "desc" }];
const groupModel: GroupModel = {
  fields: ["region"],
  expandedKeys: ["group:region=Seoul", "group:region=Busan"]
};
const aggregateModel: AggregateModel = {
  fields: [
    { field: "amount", function: "sum", alias: "amountTotal" },
    { field: "id", function: "count", alias: "orderCount" }
  ]
};

describe("client row model", () => {
  it("creates stable row identity from a rowKey field", () => {
    const model = createClientRowModel(rows, { rowKey: "id" });

    expect(model.rows.map((row) => row.key)).toEqual([
      "ORD-5101",
      "ORD-5102",
      "ORD-5103",
      "ORD-5104"
    ]);
    expect(model.byKey.get("ORD-5101")?.data.customer).toBe("Treasury");
  });

  it("supports set, append, update, and remove transactions", () => {
    const store = setClientRows(rows.slice(0, 2), "id");
    const appended = appendClientRows(store, rows.slice(2), "id");
    const updated = updateClientRows(appended, [
      { key: "ORD-5102", data: { ...rows[1], amount: 990 } }
    ]);
    const removed = removeClientRows(updated, ["ORD-5104"]);

    expect(appended.rows).toHaveLength(4);
    expect(updated.byKey.get("ORD-5102")?.data.amount).toBe(990);
    expect(removed.rows.map((row) => row.key)).toEqual(["ORD-5101", "ORD-5102", "ORD-5103"]);
  });

  it("filters, sorts, groups, and aggregates client rows", () => {
    const model = createClientRowModel(rows, {
      rowKey: "id",
      filterModel,
      sortModel,
      groupModel,
      aggregateModel
    });

    expect(model.filteredRows.map((row) => row.key)).toEqual([
      "ORD-5101",
      "ORD-5102",
      "ORD-5103"
    ]);
    expect(model.sortedRows.map((row) => row.key)).toEqual([
      "ORD-5101",
      "ORD-5102",
      "ORD-5103"
    ]);
    expect(model.aggregateValues).toEqual({ amountTotal: 2780, orderCount: 3 });
    expect(model.visibleRows.map((row) => row.key)).toEqual([
      "group:region=Seoul",
      "ORD-5101",
      "ORD-5103",
      "group:region=Busan",
      "ORD-5102"
    ]);

    const seoul = model.visibleRows[0];
    expect(seoul).toMatchObject({
      kind: "group",
      key: "group:region=Seoul",
      childCount: 2,
      aggregateValues: { amountTotal: 1870, orderCount: 2 }
    });
  });

  it("adds bottom group footers with aggregate values", () => {
    const model = createClientRowModel(rows, {
      rowKey: "id",
      filterModel,
      sortModel,
      groupModel,
      groupFooter: "bottom",
      aggregateModel
    });

    expect(model.visibleRows.map((row) => row.key)).toEqual([
      "group:region=Seoul",
      "ORD-5101",
      "ORD-5103",
      "group:region=Seoul:footer",
      "group:region=Busan",
      "ORD-5102",
      "group:region=Busan:footer"
    ]);
    expect(model.visibleRows[3]).toMatchObject({
      kind: "groupFooter",
      groupKey: "group:region=Seoul",
      aggregateValues: { amountTotal: 1870, orderCount: 2 }
    });
  });
});
