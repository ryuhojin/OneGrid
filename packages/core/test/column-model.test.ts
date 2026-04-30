import { describe, expect, it } from "vitest";
import { collectLeafColumns, createColumnModel } from "../src/index.js";
import type { ColumnDef } from "../src/index.js";

interface OrderRow {
  readonly id: string;
  readonly customer: string;
  readonly amount: number;
  readonly status: "Draft" | "Approved";
}

const columns: readonly ColumnDef<OrderRow>[] = [
  { id: "order-id", field: "id", headerName: "ID", pinned: "left", width: 96 },
  {
    groupId: "commercial",
    headerName: "Commercial",
    children: [
      { field: "customer", headerName: "Customer", minWidth: 160, flex: 1 },
      { field: "amount", headerName: "Amount", width: 40, minWidth: 90, maxWidth: 120 },
      { field: "amount", headerName: "Amount Hidden", hidden: true }
    ]
  },
  { field: "status", headerName: "Status", pinned: "right", width: 128 }
];

describe("core column model", () => {
  it("normalizes columns into immutable root and leaf models", () => {
    const model = createColumnModel(columns);

    expect(Object.isFrozen(model)).toBe(true);
    expect(model.rootColumns).toHaveLength(3);
    expect(model.leafColumns.map((column) => column.id)).toEqual([
      "order-id",
      "customer",
      "amount",
      "amount__2",
      "status"
    ]);
    expect(collectLeafColumns(model.rootColumns)).toHaveLength(5);
  });

  it("resolves id, field, width, min, max, and flex metadata", () => {
    const model = createColumnModel(columns);
    const amount = model.byId.get("amount");
    const customer = model.byId.get("customer");

    if (!amount || amount.kind !== "data") {
      throw new Error("amount column should resolve to a data column");
    }

    if (!customer || customer.kind !== "data") {
      throw new Error("customer column should resolve to a data column");
    }

    expect(amount.width).toBe(90);
    expect(amount.minWidth).toBe(90);
    expect(amount.maxWidth).toBe(120);
    expect(customer.flex).toBe(1);
  });

  it("separates hidden and pinned leaf columns", () => {
    const model = createColumnModel(columns);

    expect(model.visibleLeafColumns.map((column) => column.id)).toEqual([
      "order-id",
      "customer",
      "amount",
      "status"
    ]);
    expect(model.hiddenLeafColumns.map((column) => column.id)).toEqual(["amount__2"]);
    expect(model.pinnedLeafColumns.left.map((column) => column.id)).toEqual(["order-id"]);
    expect(model.pinnedLeafColumns.center.map((column) => column.id)).toEqual([
      "customer",
      "amount"
    ]);
    expect(model.pinnedLeafColumns.right.map((column) => column.id)).toEqual(["status"]);
  });

  it("applies a stable column order without dropping missing columns", () => {
    const model = createColumnModel(columns, {
      columnOrder: ["status", "customer"]
    });

    expect(model.order.visible).toEqual(["status", "customer", "order-id", "amount"]);
    expect(model.visibleLeafColumns.map((column) => column.orderIndex)).toEqual([0, 1, 2, 3]);
  });
});
