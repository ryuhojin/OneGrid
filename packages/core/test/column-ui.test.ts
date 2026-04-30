import { describe, expect, it } from "vitest";
import {
  autoSizeColumn,
  createColumnMenuModel,
  createColumnModel,
  createColumnsToolPanelModel,
  moveColumnBefore,
  pinColumn,
  resizeColumn,
  setColumnHidden
} from "../src/index.js";
import type { ColumnDef, ColumnUiState } from "../src/index.js";

interface ColumnUiOrderRow {
  readonly id: string;
  readonly customer: string;
  readonly region: string;
  readonly amount: number;
  readonly status: "Draft" | "Approved";
}

const columns: readonly ColumnDef<ColumnUiOrderRow>[] = [
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 96 },
  {
    groupId: "commercial",
    headerName: "Commercial",
    children: [
      { field: "customer", headerName: "Customer", width: 140, minWidth: 100 },
      { field: "region", headerName: "Region", width: 120 },
      { field: "amount", headerName: "Amount", width: 100, maxWidth: 180 }
    ]
  },
  { field: "status", headerName: "Status", width: 128 }
];

const rows: readonly ColumnUiOrderRow[] = [
  {
    id: "ORD-4101",
    customer: "National Treasury Procurement Authority",
    region: "Seoul",
    amount: 1200000,
    status: "Approved"
  }
];

describe("core column UI state", () => {
  it("resizes and auto sizes columns through immutable state", () => {
    const model = createColumnModel(columns);
    const resized = resizeColumn(model, {}, "customer", 220);
    const autoSized = autoSizeColumn(model, resized, "customer", { rows });
    const nextModel = createColumnModel(columns, { columnState: autoSized });
    const customer = nextModel.byId.get("customer");

    expect(customer).toMatchObject({ kind: "data" });
    expect(customer && "width" in customer ? customer.width : 0).toBeGreaterThan(220);
    expect(resized).not.toBe(autoSized);
  });

  it("moves, hides, shows, pins, and unpins leaf columns", () => {
    const model = createColumnModel(columns);
    let state: ColumnUiState = moveColumnBefore(model, {}, "status", "customer");
    state = setColumnHidden(state, "region", true);
    state = pinColumn(state, "customer", "right");

    const changedModel = createColumnModel(columns, { columnState: state });
    expect(changedModel.order.all).toEqual(["id", "status", "customer", "region", "amount"]);
    expect(changedModel.order.visible).toEqual(["id", "status", "customer", "amount"]);
    expect(changedModel.pinnedLeafColumns.right.map((column) => column.id)).toContain("customer");

    state = setColumnHidden(state, "region", false);
    state = pinColumn(state, "customer", null);

    const restoredModel = createColumnModel(columns, { columnState: state });
    expect(restoredModel.order.visible).toContain("region");
    expect(restoredModel.byId.get("customer")).toMatchObject({ pinned: undefined });
  });

  it("creates menu and tool panel models for renderer integration", () => {
    const model = createColumnModel(columns);
    const menu = createColumnMenuModel(model, {}, "customer");
    const panel = createColumnsToolPanelModel(model);

    expect(menu?.items.map((item) => item.action)).toEqual([
      "autoSize",
      "hide",
      "pinLeft",
      "pinRight",
      "unpin",
      "moveLeft",
      "moveRight"
    ]);
    expect(menu?.items.find((item) => item.action === "unpin")?.enabled).toBe(false);
    expect(panel.columns.find((column) => column.id === "customer")?.groupPath).toEqual([
      "Commercial"
    ]);
  });
});
