import { describe, expect, it } from "vitest";
import { normalizeTreeRows, TreeRowModel } from "../src/index.js";
import type { ColumnDef } from "../src/index.js";

interface TreeOrderRow {
  readonly id: string;
  readonly name: string;
  readonly hasChildren?: boolean;
  readonly children?: readonly TreeOrderRow[];
}

const rows: readonly TreeOrderRow[] = [
  {
    id: "A",
    name: "Assets",
    children: [
      { id: "A-1", name: "Cash" },
      { id: "A-2", name: "Receivables" }
    ]
  },
  { id: "B", name: "Liabilities", hasChildren: true }
];

const columns: readonly ColumnDef<TreeOrderRow>[] = [
  { field: "name", headerName: "Name" }
];

describe("tree row model", () => {
  it("normalizes nested tree rows with parent, depth, and paths", () => {
    const store = normalizeTreeRows(rows, { rowKey: "id" });
    const child = store.nodes.get("A-1");

    expect(store.roots).toEqual(["A", "B"]);
    expect(store.nodes.get("A")?.childrenKeys).toEqual(["A-1", "A-2"]);
    expect(child?.parentKey).toBe("A");
    expect(child?.depth).toBe(1);
    expect(child?.path).toEqual(["A", "A-1"]);
  });

  it("expands and collapses visible tree rows", async () => {
    const model = new TreeRowModel<TreeOrderRow>(rows, { rowKey: "id", expandedKeys: ["A"] });

    expect(model.visibleRows.map((entry) => entry.key)).toEqual(["A", "A-1", "A-2", "B"]);

    model.collapse("A");
    expect(model.visibleRows.map((entry) => entry.key)).toEqual(["A", "B"]);

    await model.expand("A");
    expect(model.visibleRows.map((entry) => entry.key)).toEqual(["A", "A-1", "A-2", "B"]);
  });

  it("loads lazy children through DataSource.getChildren", async () => {
    const model = new TreeRowModel<TreeOrderRow>(rows, {
      rowKey: "id",
      hasChildrenField: "hasChildren",
      filterModel: { quickText: "pay" },
      sortModel: [{ field: "name", direction: "asc" }],
      dataSource: {
        async getChildren(request) {
          expect(request.parentKey).toBe("B");
          expect(request.filterModel?.quickText).toBe("pay");
          expect(request.sortModel).toEqual([{ field: "name", direction: "asc" }]);
          return {
            rows: [
              { id: "B-1", name: "Payables" },
              { id: "B-2", name: "Accruals" }
            ]
          };
        }
      }
    });

    await model.expand("B");

    expect(model.visibleRows.map((entry) => entry.key)).toEqual(["B", "B-1"]);
    expect(model.visibleRows.find((entry) => entry.key === "B-1")?.depth).toBe(1);
  });

  it("filters tree rows with ancestor context", async () => {
    const model = new TreeRowModel<TreeOrderRow>(rows, {
      rowKey: "id",
      columns,
      expandedKeys: ["A"],
      filterModel: {
        conditions: [{ field: "name", kind: "text", operator: "contains", value: "Cash" }]
      },
      filterPolicy: "withAncestors"
    });

    expect(model.visibleRows.map((entry) => entry.key)).toEqual(["A", "A-1"]);
  });

  it("sorts tree siblings without flattening hierarchy", async () => {
    const model = new TreeRowModel<TreeOrderRow>(rows, {
      rowKey: "id",
      columns,
      expandedKeys: ["A"],
      sortModel: [{ field: "name", direction: "desc" }],
      sortPolicy: "siblings"
    });

    expect(model.visibleRows.map((entry) => entry.key)).toEqual(["B", "A", "A-2", "A-1"]);
  });

  it("computes indentation metadata", async () => {
    const model = new TreeRowModel<TreeOrderRow>(rows, {
      rowKey: "id",
      expandedKeys: ["A"],
      indentSize: 24
    });

    const child = model.visibleRows.find((entry) => entry.key === "A-1");
    expect(child?.indent).toBe(24);
    expect(child?.ariaLevel).toBe(2);
  });

  it("applies descendants selection policy", async () => {
    const model = new TreeRowModel<TreeOrderRow>(rows, {
      rowKey: "id",
      expandedKeys: ["A"],
      selection: { policy: "descendants" }
    });

    model.select("A", true);
    expect(model.selected).toEqual(["A", "A-1", "A-2"]);

    model.select("A", false);
    expect(model.selected).toEqual([]);
  });

  it("marks partially selected parents as mixed", async () => {
    const model = new TreeRowModel<TreeOrderRow>(rows, {
      rowKey: "id",
      expandedKeys: ["A"],
      selection: { policy: "descendants" }
    });

    model.select("A-1", true);

    expect(model.visibleRows.find((entry) => entry.key === "A")?.selectionState).toBe("mixed");
    expect(model.visibleRows.find((entry) => entry.key === "A-1")?.selectionState).toBe("checked");
  });
});
