import { describe, expect, it } from "vitest";
import {
  appendClientRows,
  appendClientRowsWithResult,
  createClientRowModel,
  DuplicateRowKeyError,
  removeClientRows,
  removeClientRowsWithResult,
  setClientRows,
  setClientRowsWithResult,
  updateClientRows,
  updateClientRowsWithResult
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
    const setResult = setClientRowsWithResult(rows.slice(0, 2), "id");
    const store = setResult.store;
    const appendResult = appendClientRowsWithResult(store, rows.slice(2), "id");
    const appended = appendResult.store;
    const updateResult = updateClientRowsWithResult(appended, [
      { key: "ORD-5102", data: { ...rows[1], amount: 990 } }
    ]);
    const updated = updateResult.store;
    const removeResult = removeClientRowsWithResult(updated, ["ORD-5104"]);
    const removed = removeResult.store;

    expect(setResult.added.map((row) => row.key)).toEqual(["ORD-5101", "ORD-5102"]);
    expect(appended.rows).toHaveLength(4);
    expect(appendResult).toMatchObject({
      kind: "append",
      changed: true,
      rowCountBefore: 2,
      rowCountAfter: 4,
      requestedRowCount: 2,
      acceptedRowCount: 2,
      rejectedRowCount: 0
    });
    expect(updateResult.updated[0]).toMatchObject({
      key: "ORD-5102",
      previousData: rows[1],
      data: { ...rows[1], amount: 990 }
    });
    expect(updated.byKey.get("ORD-5102")?.data.amount).toBe(990);
    expect(removeResult.removed.map((row) => row.key)).toEqual(["ORD-5104"]);
    expect(removed.rows.map((row) => row.key)).toEqual(["ORD-5101", "ORD-5102", "ORD-5103"]);

    expect(appendClientRows(store, rows.slice(2), "id").rows).toHaveLength(4);
    expect(updateClientRows(appended, [{ key: "ORD-5102", data: rows[1] }]).byKey.get("ORD-5102")?.data)
      .toEqual(rows[1]);
    expect(removeClientRows(updated, ["ORD-5104"]).rows).toHaveLength(3);
    expect(setClientRows(rows.slice(0, 1), "id").rows).toHaveLength(1);
  });

  it("reports duplicate and missing client row transaction requests", () => {
    const store = setClientRows(rows.slice(0, 2), "id");
    const duplicateAppend = appendClientRowsWithResult(store, [rows[0]], {
      rowKey: "id",
      duplicateRowKeyPolicy: "suffix"
    });
    const updateResult = updateClientRowsWithResult(store, [
      { key: "ORD-5102", data: { ...rows[1], amount: 1000 } },
      { key: "ORD-5102", data: { ...rows[1], amount: 1100 } },
      { key: "ORD-MISSING", data: rows[2] }
    ]);
    const removeResult = removeClientRowsWithResult(store, [
      "ORD-5101",
      "ORD-5101",
      "ORD-MISSING"
    ]);

    expect(duplicateAppend.added[0]).toMatchObject({
      key: "ORD-5101__2",
      requestedKey: "ORD-5101"
    });
    expect(updateResult.acceptedRowCount).toBe(1);
    expect(updateResult.rejected).toEqual([
      {
        reason: "duplicateKey",
        key: "ORD-5102",
        requestIndex: 0,
        data: { ...rows[1], amount: 1000 }
      },
      { reason: "missingKey", key: "ORD-MISSING", requestIndex: 2, data: rows[2] }
    ]);
    expect(updateResult.store.byKey.get("ORD-5102")?.data?.amount).toBe(1100);
    expect(removeResult.removed.map((row) => row.key)).toEqual(["ORD-5101"]);
    expect(removeResult.rejected.map((reject) => reject.reason)).toEqual([
      "duplicateKey",
      "missingKey"
    ]);
  });

  it("rejects duplicate explicit row ids by default", () => {
    expect(() => setClientRows([rows[0], rows[0]], "id")).toThrow(DuplicateRowKeyError);
    expect(() => createClientRowModel([rows[0], rows[0]], { rowKey: "id" })).toThrow(
      /Duplicate row key/
    );
    expect(() => appendClientRows(setClientRows(rows.slice(0, 1), "id"), [rows[0]], "id"))
      .toThrow(DuplicateRowKeyError);
  });

  it("can suffix duplicate row ids when explicitly requested", () => {
    const model = createClientRowModel([rows[0], rows[0]], {
      rowKey: "id",
      duplicateRowKeyPolicy: "suffix"
    });

    expect(model.rows.map((row) => row.key)).toEqual(["ORD-5101", "ORD-5101__2"]);
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

  it("resolves client sort and filter columns by columnId before field", () => {
    const model = createClientRowModel(rows, {
      rowKey: "id",
      columns: [
        {
          columnId: "amount-band",
          field: "amount",
          filter: { kind: "set" },
          valueGetter: ({ row }) => row.amount >= 900 ? "large" : "small"
        },
        {
          columnId: "amount-desc-rank",
          field: "amount",
          valueGetter: ({ row }) => -row.amount
        }
      ],
      filterModel: {
        conditions: [
          {
            columnId: "amount-band",
            field: "amount",
            kind: "set",
            operator: "in",
            value: ["large"]
          }
        ]
      },
      sortModel: [{ columnId: "amount-desc-rank", field: "amount", direction: "asc" }]
    });

    expect(model.filteredRows.map((row) => row.key)).toEqual(["ORD-5101", "ORD-5102"]);
    expect(model.sortedRows.map((row) => row.key)).toEqual(["ORD-5101", "ORD-5102"]);
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
