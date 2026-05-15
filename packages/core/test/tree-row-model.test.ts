import { describe, expect, it } from "vitest";
import { DuplicateRowKeyError, normalizeTreeRows, TreeRowModel } from "../src/index.js";
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

  it("rejects duplicate explicit tree row ids by default", () => {
    expect(() => normalizeTreeRows([
      { id: "A", name: "Assets" },
      { id: "A", name: "Duplicate" }
    ], { rowKey: "id" })).toThrow(DuplicateRowKeyError);
  });

  it("applies duplicate row id policy to lazy tree children", async () => {
    const model = new TreeRowModel<TreeOrderRow>(rows, {
      rowKey: "id",
      hasChildrenField: "hasChildren",
      dataSource: {
        async getChildren() {
          return { rows: [{ id: "A", name: "Duplicate root key" }] };
        }
      }
    });

    await expect(model.expand("B")).rejects.toBeInstanceOf(DuplicateRowKeyError);
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

  it("retries lazy children and exposes standardized DataSource status", async () => {
    let calls = 0;
    const model = new TreeRowModel<TreeOrderRow>(rows, {
      rowKey: "id",
      hasChildrenField: "hasChildren",
      retryPolicy: { attempts: 2 },
      dataSource: {
        async getChildren() {
          calls += 1;
          if (calls === 1) {
            throw Object.assign(new Error("Temporary tree failure"), { statusCode: 503 });
          }
          return { rows: [{ id: "B-1", name: "Payables" }] };
        }
      }
    });

    await model.expand("B");

    expect(calls).toBe(2);
    expect(model.status).toMatchObject({
      requestKind: "getChildren",
      status: "success",
      attempt: 2,
      maxAttempts: 2
    });
    expect(model.visibleRows.map((entry) => entry.key)).toEqual(["A", "B", "B-1"]);
  });

  it("clears lazy children loading state after standardized DataSource errors", async () => {
    const model = new TreeRowModel<TreeOrderRow>(rows, {
      rowKey: "id",
      hasChildrenField: "hasChildren",
      dataSource: {
        async getChildren() {
          throw Object.assign(new Error("Validation failed"), { statusCode: 400 });
        }
      }
    });

    await expect(model.expand("B")).rejects.toMatchObject({
      requestKind: "getChildren",
      statusCode: 400,
      retryable: false
    });

    expect(model.status).toMatchObject({
      requestKind: "getChildren",
      status: "error",
      retryable: false
    });
    expect(model.visibleRows.find((entry) => entry.key === "B")?.loading).toBe(false);
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

  it("captures and restores expanded and selected tree row state", async () => {
    const model = new TreeRowModel<TreeOrderRow>(rows, {
      rowKey: "id",
      expandedKeys: ["A"],
      selection: { policy: "descendants" }
    });
    model.select("A-1", true);

    const restored = new TreeRowModel<TreeOrderRow>(rows, {
      rowKey: "id",
      selection: { policy: "descendants" }
    });
    restored.restoreState(model.getState());

    expect(model.getState()).toMatchObject({
      rowModel: "tree",
      rowCount: 4,
      expandedKeys: ["A"],
      selectedKeys: ["A-1"]
    });
    expect(restored.visibleRows.map((entry) => entry.key)).toEqual(["A", "A-1", "A-2", "B"]);
    expect(restored.selected).toEqual(["A-1"]);
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
