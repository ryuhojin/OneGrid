import {
  createRowHeightIndex
} from "@onegrid/core";
import type { CellSpanRow, ColumnDef } from "@onegrid/core";

export const ROW_100M = 100_000_000;
export const ROW_10M = 10_000_000;
export const COLUMN_50K = 50_000;
export const ROW_20K = 20_000;

export function iterationScroll(iteration: number, maxScroll: number, step: number): number {
  const positiveMax = Math.max(0, maxScroll);
  return positiveMax === 0 ? 0 : iteration * step % positiveMax;
}

export function createColumnWidths(count: number): readonly number[] {
  return Object.freeze(Array.from({ length: count }, (_, index) => 96 + index % 11));
}

export function createVariableHeightIndex() {
  return createRowHeightIndex({
    rowCount: ROW_20K,
    estimatedRowHeight: 44,
    getRowHeight: (index) => 32 + index % 5 * 10
  });
}

export function createMergeColumns(): readonly ColumnDef<MergeRow>[] {
  return Object.freeze([
    { field: "id", pinned: "left", width: 160 },
    { field: "region", pinned: "left", width: 160, merge: { mode: "value" } },
    { field: "agency", width: 220, merge: { mode: "value" } },
    { field: "program", width: 220 },
    { field: "memo", width: 260, merge: { mode: "custom", colSpan: ({ value }) => value === "Joint" ? 2 : 1 } },
    { field: "status", pinned: "right", width: 140 }
  ]);
}

export function createFrozenColumns(): readonly ColumnDef<MergeRow>[] {
  const metricColumns = Array.from({ length: 42 }, (_, index): ColumnDef<MergeRow> => ({
    field: `metric${index + 1}`,
    headerName: `M${index + 1}`,
    width: 104
  }));
  return Object.freeze([
    { field: "id", pinned: "left", width: 160 },
    { field: "region", pinned: "left", width: 160, merge: { mode: "value" } },
    ...metricColumns,
    { field: "status", pinned: "right", width: 140 }
  ]);
}

export function createMergeRows(count: number): readonly CellSpanRow<MergeRow>[] {
  const regions = ["Capital", "Capital", "Regional", "Regional", "Digital", "Digital"];
  return Object.freeze(Array.from({ length: count }, (_, index) => {
    const region = regions[index % regions.length] ?? "Capital";
    return {
      rowIndex: index,
      rowKey: `B-${index}`,
      data: {
        id: `B-${index}`,
        region,
        agency: index % 4 < 2 ? "Treasury" : "Audit",
        program: `Program ${index % 9}`,
        memo: index % 5 < 2 ? "Joint" : "Desk",
        status: index % 3 === 0 ? "Approved" : "Review"
      }
    };
  }));
}

interface MergeRow extends Record<string, string> {
  readonly id: string;
  readonly region: string;
  readonly agency: string;
  readonly program: string;
  readonly memo: string;
  readonly status: string;
}
