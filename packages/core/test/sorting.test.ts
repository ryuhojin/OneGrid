import { describe, expect, it } from "vitest";
import {
  createClientRowModel,
  createInitialSortModel,
  getNextSortModel
} from "../src/index.js";
import type { ColumnDef } from "../src/index.js";

interface SortTestRow {
  readonly id: string;
  readonly region: string;
  readonly amount: number;
  readonly status: "Critical" | "Review" | "Ready";
}

const statusRank: Readonly<Record<SortTestRow["status"], number>> = {
  Critical: 0,
  Review: 1,
  Ready: 2
};

const rows: readonly SortTestRow[] = [
  { id: "S-1", region: "North", amount: 30, status: "Ready" },
  { id: "S-2", region: "North", amount: 10, status: "Critical" },
  { id: "S-3", region: "South", amount: 20, status: "Review" },
  { id: "S-4", region: "South", amount: 40, status: "Critical" }
];

const columns: readonly ColumnDef<SortTestRow>[] = [
  { field: "id", headerName: "ID" },
  { field: "region", headerName: "Region", sort: "asc" },
  {
    field: "status",
    headerName: "Status",
    sortComparator: (left, right) =>
      statusRank[left as SortTestRow["status"]]
        - statusRank[right as SortTestRow["status"]]
  },
  {
    columnId: "total",
    headerName: "Total",
    valueGetter: ({ row }) => row.amount * 2
  }
];

describe("sorting", () => {
  it("creates an initial model from sortable column definitions", () => {
    expect(createInitialSortModel(columns, undefined)).toEqual([
      { field: "region", direction: "asc", priority: 0 }
    ]);
  });

  it("cycles single and multi sort models", () => {
    const first = getNextSortModel([], "amount");
    const second = getNextSortModel(first, "amount");
    const multi = getNextSortModel(second, "status", {
      multiSort: true,
      additive: true
    });

    expect(first).toEqual([{ field: "amount", direction: "asc", priority: 0 }]);
    expect(second).toEqual([{ field: "amount", direction: "desc", priority: 0 }]);
    expect(multi).toEqual([
      { field: "amount", direction: "desc", priority: 0 },
      { field: "status", direction: "asc", priority: 1 }
    ]);
  });

  it("sorts client rows with custom comparators and value getters", () => {
    const byStatus = createClientRowModel(rows, {
      columns,
      rowKey: "id",
      sortModel: [{ field: "status", direction: "asc" }]
    });
    const byComputedValue = createClientRowModel(rows, {
      columns,
      rowKey: "id",
      sortModel: [{ field: "total", direction: "desc" }]
    });

    expect(byStatus.sortedRows.map((row) => row.key)).toEqual(["S-2", "S-4", "S-3", "S-1"]);
    expect(byComputedValue.sortedRows.map((row) => row.key)).toEqual(["S-4", "S-1", "S-3", "S-2"]);
  });

  it("sorts fieldless valueGetter columns by columnId", () => {
    const byComputedValue = createClientRowModel(rows, {
      columns,
      rowKey: "id",
      sortModel: [{ field: "total", direction: "asc" }]
    });

    expect(byComputedValue.sortedRows.map((row) => row.key)).toEqual(["S-2", "S-3", "S-1", "S-4"]);
  });
});
