import { describe, expect, it } from "vitest";
import { OneGrid } from "../src/index.js";

describe("@onegrid/dom state and column APIs", () => {
  it("restores and captures runtime state snapshots", async () => {
    const el = document.createElement("div");
    const grid = new OneGrid({
      el,
      columns: [
        { field: "id", headerName: "ID", width: 80 },
        { field: "name", headerName: "Name", width: 140 },
        { field: "amount", headerName: "Amount", width: 120 }
      ],
      data: [
        { id: "S-1", name: "Alpha", amount: 20 },
        { id: "S-2", name: "Beta", amount: 10 }
      ],
      rowKey: "id",
      layout: { height: 220 },
      initialState: {
        columnState: { columns: { amount: { hidden: true } } },
        sortModel: [{ columnId: "name", field: "name", direction: "asc" }],
        filterModel: { quickText: "Alpha" },
        selection: { mode: "row", rowKeys: ["S-1"], cells: [], ranges: [] },
        pagination: { page: 2, pageSize: 25 },
        scroll: { top: 30, left: 12 },
        locale: "ko-KR"
      }
    });

    expect(grid.getState()).toMatchObject({
      sortModel: [{ columnId: "name", field: "name", direction: "asc" }],
      filterModel: { quickText: "Alpha" },
      selection: { rowKeys: ["S-1"] },
      pagination: { page: 2, pageSize: 25 },
      scroll: { top: 30 },
      rowModelState: { rowModel: "client", rowCount: 2 },
      locale: "ko-KR"
    });
    expect(el.textContent).not.toContain("Amount");

    grid.setState({
      columnState: { columns: { amount: { hidden: false } } },
      filterModel: {},
      selection: { mode: "row", rowKeys: ["S-2"], cells: [], ranges: [] },
      scroll: { top: 0, left: 0 },
      locale: "en-US"
    });
    await Promise.resolve();

    expect(grid.getState()).toMatchObject({
      filterModel: {},
      selection: { rowKeys: ["S-2"] },
      scroll: { top: 0, left: 0 },
      locale: "en-US"
    });
    expect(el.textContent).toContain("Amount");

    grid.setColumnState({ columns: { amount: { hidden: true } } });
    await Promise.resolve();

    expect(grid.getColumnState().columns?.amount?.hidden).toBe(true);
    expect(el.textContent).not.toContain("Amount");

    grid.resetColumnState();
    await Promise.resolve();

    expect(grid.getColumnState().columns?.amount?.hidden).toBeUndefined();
    expect(el.textContent).toContain("Amount");

    const rejected = grid.applyColumnState({
      state: { columns: { missing: { hidden: true } } }
    });
    expect(rejected.applied).toBe(false);
    expect(rejected.missingColumnIds).toEqual(["missing"]);

    const applied = grid.applyColumnState({
      state: {
        order: ["amount", "id"],
        columns: { name: { hidden: true }, amount: { width: 40 } }
      },
      applyOrder: true
    });
    await Promise.resolve();

    expect(applied.applied).toBe(true);
    expect(grid.getColumnState().order).toEqual(["amount", "id", "name"]);
    expect(grid.getColumnState({ includeDefaults: true }).columns?.amount).toMatchObject({
      width: 40,
      hidden: false,
      pinned: null
    });
    expect(el.textContent).not.toContain("Name");

    grid.destroy();
  });

  it("cancels public before events before state mutations", async () => {
    const el = document.createElement("div");
    const grid = new OneGrid({
      el,
      columns: [
        { field: "id", headerName: "ID" },
        { field: "name", headerName: "Name" }
      ],
      data: [{ id: "S-1", name: "Alpha" }],
      rowKey: "id",
      beforeEvents: {
        beforeColumnStateChange(event) {
          if (event.event.columnState.columns?.name?.hidden === true) {
            event.preventDefault("required-column");
          }
        }
      }
    });

    grid.setColumnState({ columns: { name: { hidden: true } } });
    await Promise.resolve();

    expect(grid.getColumnState().columns?.name?.hidden).not.toBe(true);
    expect(el.textContent).toContain("Name");

    grid.setColumnState({ columns: { name: { hidden: true } } }, { render: false });
    expect(grid.getColumnState().columns?.name?.hidden).not.toBe(true);

    const unsubscribe = grid.onBefore("beforeSortChange", (event) => {
      event.preventDefault("locked-sort");
    });
    grid.setSortModel([{ field: "id", direction: "asc" }]);

    expect(grid.getSortModel()).toEqual([]);

    grid.setState({ sortModel: [{ field: "name", direction: "desc" }] }, { render: false });
    expect(grid.getSortModel()).toEqual([]);

    const unsubscribeSelection = grid.onBefore("beforeSelectionChange", (event) => {
      event.preventDefault("locked-selection");
    });
    grid.setState({
      selection: { mode: "row", rowKeys: ["S-1"], cells: [], ranges: [] }
    }, { render: false });

    expect(grid.getSelectionState().rowKeys).toEqual([]);
    unsubscribeSelection();

    unsubscribe();
    grid.setSortModel([{ field: "id", direction: "asc" }]);

    expect(grid.getSortModel()).toEqual([{ field: "id", direction: "asc", priority: 0 }]);

    grid.destroy();
  });

  it("stores constrained column state for married group headers", async () => {
    const el = document.createElement("div");
    const grid = new OneGrid({
      el,
      columns: [
        { columnId: "id", field: "id", headerName: "ID" },
        {
          columnId: "workflow",
          headerName: "Workflow",
          marryChildren: true,
          children: [
            { columnId: "workflow-title", field: "title", headerName: "Title" },
            { columnId: "workflow-owner", field: "owner", headerName: "Owner" }
          ]
        },
        { columnId: "status", field: "status", headerName: "Status" }
      ],
      data: [{ id: "M-1", title: "Review", owner: "Han", status: "Open" }]
    });

    grid.setColumnState({
      order: ["workflow-title", "status", "workflow-owner", "id"]
    });
    await Promise.resolve();

    expect(grid.getColumnState().order).toEqual([
      "workflow-title",
      "workflow-owner",
      "status",
      "id"
    ]);
    expect(el.querySelector('[data-source-id="workflow"]')?.getAttribute("aria-colspan")).toBe("2");

    grid.destroy();
  });

  it("applies column group open state through public APIs", async () => {
    const el = document.createElement("div");
    const grid = new OneGrid({
      el,
      columns: [
        { columnId: "id", field: "id", headerName: "ID" },
        {
          columnId: "workflow",
          headerName: "Workflow",
          openByDefault: false,
          children: [
            { columnId: "summary", field: "status", headerName: "Summary", columnGroupShow: "closed" },
            { columnId: "owner", field: "owner", headerName: "Owner", columnGroupShow: "open" },
            { columnId: "amount", field: "amount", headerName: "Amount" }
          ]
        }
      ],
      data: [{ id: "G-1", status: "Closed view", owner: "Han", amount: 1200 }]
    });

    expect(el.textContent).toContain("Summary");
    expect(el.textContent).not.toContain("Owner");

    grid.setColumnGroupOpen("workflow", true);
    await Promise.resolve();

    expect(grid.getColumnState().groups?.workflow?.open).toBe(true);
    expect(el.textContent).not.toContain("Summary");
    expect(el.textContent).toContain("Owner");

    grid.toggleColumnGroup("workflow");
    await Promise.resolve();

    expect(grid.getColumnState().groups?.workflow?.open).toBe(false);
    expect(el.textContent).toContain("Summary");

    grid.destroy();
  });

  it("honors column policy flags through public column APIs", async () => {
    const el = document.createElement("div");
    const grid = new OneGrid({
      el,
      columns: [
        { columnId: "id", field: "id", headerName: "ID", hideable: false, lockPosition: true },
        { columnId: "name", field: "name", headerName: "Name", lockVisible: true },
        { columnId: "amount", field: "amount", headerName: "Amount", pinned: "left", lockPinned: true },
        { columnId: "status", field: "status", headerName: "Status" }
      ],
      data: [{ id: "P-1", name: "Alpha", amount: 100, status: "Open" }]
    });

    grid.setColumnState({
      order: ["status", "amount", "name", "id"],
      columns: {
        id: { hidden: true },
        name: { hidden: true },
        amount: { pinned: null }
      }
    });
    await Promise.resolve();

    expect(grid.getColumnState().order).toEqual(["id", "status", "amount", "name"]);
    expect(grid.getColumnState().columns?.id?.hidden).toBeUndefined();
    expect(grid.getColumnState().columns?.name?.hidden).toBeUndefined();
    expect(grid.getColumnState().columns?.amount?.pinned).toBeUndefined();

    grid.hideColumn("id");
    grid.hideColumn("name");
    grid.pinColumn("amount", null);
    const result = grid.applyColumnState({
      state: {
        order: ["status", "amount", "name", "id"],
        columns: {
          id: { hidden: true },
          name: { hidden: true },
          amount: { pinned: null },
          status: { pinned: "right" }
        }
      },
      applyOrder: true
    });
    await Promise.resolve();

    expect(result.applied).toBe(true);
    expect(grid.getColumnState().order).toEqual(["id", "status", "amount", "name"]);
    expect(grid.getColumnState().columns?.id?.hidden).toBeUndefined();
    expect(grid.getColumnState().columns?.name?.hidden).toBeUndefined();
    expect(grid.getColumnState().columns?.amount?.pinned).toBeUndefined();
    expect(grid.getColumnState().columns?.status?.pinned).toBe("right");
    expect(grid.getColumnState({ includeDefaults: true }).columns?.amount?.pinned).toBe("left");
    expect(el.textContent).toContain("ID");
    expect(el.textContent).toContain("Name");

    grid.destroy();
  });
});
