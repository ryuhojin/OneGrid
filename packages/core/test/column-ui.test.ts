import { describe, expect, it } from "vitest";
import {
  autoSizeColumn,
  applyColumnUiState,
  createColumnMenuModel,
  createColumnModel,
  createColumnStateSnapshot,
  createColumnsToolPanelModel,
  moveColumnBefore,
  pinColumn,
  resizeColumn,
  setColumnGroupOpen,
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
    state = setColumnHidden(model, state, "region", true);
    state = pinColumn(model, state, "customer", "right");

    const changedModel = createColumnModel(columns, { columnState: state });
    expect(changedModel.order.all).toEqual(["id", "status", "customer", "region", "amount"]);
    expect(changedModel.order.visible).toEqual(["id", "status", "customer", "amount"]);
    expect(changedModel.pinnedLeafColumns.right.map((column) => column.id)).toContain("customer");

    state = setColumnHidden(model, state, "region", false);
    state = pinColumn(model, state, "customer", null);

    const restoredModel = createColumnModel(columns, { columnState: state });
    expect(restoredModel.order.visible).toContain("region");
    expect(restoredModel.byId.get("customer")).toMatchObject({ pinned: undefined });
  });

  it("moves marryChildren group leaves as one block", () => {
    const model = createColumnModel<ColumnUiOrderRow>([
      { columnId: "id", field: "id", headerName: "ID" },
      {
        columnId: "workflow",
        headerName: "Workflow",
        marryChildren: true,
        children: [
          { columnId: "workflow-customer", field: "customer", headerName: "Customer" },
          { columnId: "workflow-region", field: "region", headerName: "Region" }
        ]
      },
      { columnId: "amount", field: "amount", headerName: "Amount" },
      { columnId: "status", field: "status", headerName: "Status" }
    ]);

    const state = moveColumnBefore(model, {}, "workflow-region", "status");

    expect(state.order).toEqual(["id", "amount", "workflow-customer", "workflow-region", "status"]);
  });

  it("moves a column before the whole married block when targeting a child", () => {
    const model = createColumnModel<ColumnUiOrderRow>([
      { columnId: "id", field: "id", headerName: "ID" },
      {
        columnId: "workflow",
        headerName: "Workflow",
        marryChildren: true,
        children: [
          { columnId: "workflow-customer", field: "customer", headerName: "Customer" },
          { columnId: "workflow-region", field: "region", headerName: "Region" }
        ]
      },
      { columnId: "amount", field: "amount", headerName: "Amount" },
      { columnId: "status", field: "status", headerName: "Status" }
    ]);

    const state = moveColumnBefore(model, {}, "amount", "workflow-region");

    expect(state.order).toEqual(["id", "amount", "workflow-customer", "workflow-region", "status"]);
  });

  it("does not move a married group block when one child is non-movable", () => {
    const model = createColumnModel<ColumnUiOrderRow>([
      { columnId: "id", field: "id", headerName: "ID" },
      {
        columnId: "workflow",
        headerName: "Workflow",
        marryChildren: true,
        children: [
          { columnId: "workflow-customer", field: "customer", headerName: "Customer" },
          { columnId: "workflow-region", field: "region", headerName: "Region", movable: false }
        ]
      },
      { columnId: "status", field: "status", headerName: "Status" }
    ]);

    expect(moveColumnBefore(model, {}, "workflow-customer", "status")).toEqual({});
  });

  it("honors column policy flags across move, visibility, pinning, menu, and panel models", () => {
    const model = createColumnModel<ColumnUiOrderRow>([
      { columnId: "id", field: "id", headerName: "ID", lockPosition: true },
      { columnId: "customer", field: "customer", headerName: "Customer", lockVisible: true },
      { columnId: "region", field: "region", headerName: "Region", hideable: false },
      { columnId: "amount", field: "amount", headerName: "Amount", lockPinned: true },
      { columnId: "status", field: "status", headerName: "Status", pinnable: false }
    ]);

    expect(moveColumnBefore(model, {}, "id", "status")).toEqual({});
    expect(setColumnHidden(model, {}, "customer", true)).toEqual({});
    expect(setColumnHidden(model, {}, "region", true)).toEqual({});
    expect(pinColumn(model, {}, "amount", "left")).toEqual({});
    expect(pinColumn(model, {}, "status", "right")).toEqual({});

    const menu = createColumnMenuModel(model, {}, "customer");
    const panel = createColumnsToolPanelModel(model);

    expect(menu?.items.find((item) => item.action === "hide")?.enabled).toBe(false);
    expect(panel.columns.find((column) => column.id === "region")?.hideable).toBe(false);
    expect(panel.columns.find((column) => column.id === "status")?.pinnable).toBe(false);
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

  it("applies partial column state with order, defaults, and width clamping", () => {
    const model = createColumnModel(columns);
    const result = applyColumnUiState(model, {}, {
      state: {
        order: ["amount", "customer"],
        columns: {
          amount: { width: 240, hidden: false },
          customer: { pinned: "right" }
        }
      },
      defaultState: { hidden: true, pinned: null },
      applyOrder: true
    });

    expect(result.applied).toBe(true);
    expect(result.missingColumnIds).toEqual([]);
    expect(result.appliedColumnIds).toEqual(["amount", "customer", "id", "region", "status"]);
    expect(result.state.order).toEqual(["amount", "customer", "id", "region", "status"]);
    expect(result.state.columns?.amount).toMatchObject({ width: 180, hidden: false });
    expect(result.state.columns?.customer).toMatchObject({ pinned: "right" });
    expect(result.state.columns?.status).toMatchObject({ hidden: true, pinned: null });
  });

  it("applies column state without violating locked visibility, pinning, and position", () => {
    const model = createColumnModel<ColumnUiOrderRow>([
      { columnId: "id", field: "id", headerName: "ID", lockPosition: true },
      { columnId: "customer", field: "customer", headerName: "Customer", lockVisible: true },
      { columnId: "amount", field: "amount", headerName: "Amount", pinned: "left", lockPinned: true },
      { columnId: "status", field: "status", headerName: "Status" }
    ]);
    const result = applyColumnUiState(model, {}, {
      state: {
        order: ["status", "amount", "customer", "id"],
        columns: {
          customer: { hidden: true },
          amount: { pinned: null },
          status: { hidden: true, pinned: "right" }
        }
      },
      applyOrder: true
    });

    expect(result.state.order).toEqual(["id", "status", "amount", "customer"]);
    expect(result.state.columns?.customer?.hidden).toBeUndefined();
    expect(result.state.columns?.amount?.pinned).toBeUndefined();
    expect(result.state.columns?.status).toMatchObject({ hidden: true, pinned: "right" });
  });

  it("applies column state order without breaking married groups", () => {
    const model = createColumnModel<ColumnUiOrderRow>([
      { columnId: "id", field: "id", headerName: "ID" },
      {
        columnId: "workflow",
        headerName: "Workflow",
        marryChildren: true,
        children: [
          { columnId: "workflow-customer", field: "customer", headerName: "Customer" },
          { columnId: "workflow-region", field: "region", headerName: "Region" }
        ]
      },
      { columnId: "amount", field: "amount", headerName: "Amount" },
      { columnId: "status", field: "status", headerName: "Status" }
    ]);
    const result = applyColumnUiState(model, {}, {
      state: { order: ["workflow-customer", "status", "workflow-region", "amount"] },
      applyOrder: true
    });

    expect(result.state.order).toEqual([
      "workflow-customer",
      "workflow-region",
      "status",
      "amount",
      "id"
    ]);
  });

  it("does not apply unknown column state unless explicitly ignored", () => {
    const model = createColumnModel(columns);
    const blocked = applyColumnUiState(model, {}, {
      state: {
        order: ["missing"],
        columns: { missing: { hidden: true } }
      }
    });
    const ignored = applyColumnUiState(model, {}, {
      state: {
        order: ["missing", "amount"],
        columns: { missing: { hidden: true }, amount: { hidden: true } }
      },
      applyOrder: true,
      ignoreMissingColumns: true
    });

    expect(blocked.applied).toBe(false);
    expect(blocked.missingColumnIds).toEqual(["missing"]);
    expect(blocked.state).toEqual({});
    expect(ignored.applied).toBe(true);
    expect(ignored.missingColumnIds).toEqual(["missing"]);
    expect(ignored.state.order?.[0]).toBe("amount");
    expect(ignored.state.columns?.amount?.hidden).toBe(true);
    expect(ignored.state.columns?.missing).toBeUndefined();
  });

  it("applies group open state and reports unknown group ids", () => {
    const model = createColumnModel<ColumnUiOrderRow>([
      { columnId: "id", field: "id", headerName: "ID" },
      {
        columnId: "workflow",
        headerName: "Workflow",
        openByDefault: false,
        children: [
          { columnId: "summary", field: "status", headerName: "Summary", columnGroupShow: "closed" },
          { columnId: "owner", field: "customer", headerName: "Owner", columnGroupShow: "open" }
        ]
      }
    ]);

    const openedState = setColumnGroupOpen(model, {}, "workflow", true);
    const openedModel = createColumnModel(model.rootColumns.map((column) => column.source), {
      columnState: openedState
    });
    const blocked = applyColumnUiState(model, {}, {
      state: { groups: { missing: { open: true } } }
    });
    const applied = applyColumnUiState(model, {}, {
      state: { groups: { workflow: { open: true } } }
    });

    expect(openedModel.visibleLeafColumns.map((column) => column.id)).toEqual(["id", "owner"]);
    expect(blocked.applied).toBe(false);
    expect(blocked.missingGroupIds).toEqual(["missing"]);
    expect(applied.applied).toBe(true);
    expect(applied.appliedGroupIds).toEqual(["workflow"]);
    expect(applied.state.groups?.workflow?.open).toBe(true);
  });

  it("captures full column state snapshots when defaults are requested", () => {
    const state = {
      columns: { amount: { hidden: true }, customer: { width: 160, pinned: "left" } }
    } satisfies ColumnUiState;
    const model = createColumnModel(columns, { columnState: state });
    const snapshot = createColumnStateSnapshot(model, state, { includeDefaults: true });

    expect(snapshot.order).toEqual(["id", "customer", "region", "amount", "status"]);
    expect(snapshot.columns?.customer).toEqual({ width: 160, hidden: false, pinned: "left" });
    expect(snapshot.columns?.amount).toEqual({ width: 100, hidden: true, pinned: null });
    expect(snapshot.columns?.status).toEqual({ width: 128, hidden: false, pinned: null });
    expect(snapshot.groups?.commercial).toEqual({ open: true });
  });
});
