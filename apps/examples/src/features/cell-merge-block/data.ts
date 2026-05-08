import type { ColumnDef, GridOptions, SelectionOptions } from "@onegrid/core";

export interface CellMergeBlockRow {
  readonly id: string;
  readonly review: string;
  readonly task: string;
  readonly owner: string;
  readonly due: string;
  readonly status: "Ready" | "Review" | "Hold";
  readonly blockSpan: boolean;
}

export const cellMergeBlockRows: readonly CellMergeBlockRow[] = Object.freeze([
  createRow("BLK-0001", "Joint review window", "Budget approval", "Han", "2026-05-11", "Review", true),
  createRow("BLK-0002", "Joint review window", "Bond issuance", "Han", "2026-05-12", "Review", false),
  createRow("BLK-0003", "Field exception", "Risk sampling", "Lee", "2026-05-14", "Hold", false),
  createRow("BLK-0004", "Security release", "Identity sync", "Kang", "2026-05-16", "Ready", true),
  createRow("BLK-0005", "Security release", "Records cloud", "Kang", "2026-05-17", "Ready", false),
  createRow("BLK-0006", "Public audit", "Desk review", "Park", "2026-05-18", "Review", false)
]);

export const cellMergeBlockColumns: readonly ColumnDef<CellMergeBlockRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 124 },
  {
    field: "review",
    headerName: "Block merge",
    width: 180,
    merge: {
      mode: "custom",
      rowSpan: ({ row }) => row.blockSpan ? 2 : 1,
      colSpan: ({ row }) => row.blockSpan ? 2 : 1
    }
  },
  { field: "task", headerName: "Task", width: 190 },
  { field: "owner", headerName: "Owner", width: 128 },
  { field: "due", headerName: "Due", type: "date", width: 132 },
  { field: "status", headerName: "Status", pinned: "right", width: 132 }
];

export const cellMergeBlockSelection: SelectionOptions = {
  mode: "range",
  multiple: true,
  selectAll: "none"
};

export const cellMergeBlockOptions: GridOptions<CellMergeBlockRow> = {
  columns: cellMergeBlockColumns,
  data: cellMergeBlockRows,
  rowKey: "id",
  rowModel: "client",
  rowHeight: 38,
  layout: { width: "100%", height: 330, bodyHeight: 330 },
  merge: { enabled: true },
  selection: cellMergeBlockSelection,
  accessibility: { label: "Cell merge block grid" }
};

function createRow(
  id: string,
  review: string,
  task: string,
  owner: string,
  due: string,
  status: CellMergeBlockRow["status"],
  blockSpan: boolean
): CellMergeBlockRow {
  return { id, review, task, owner, due, status, blockSpan };
}
