import type { ColumnDef, GridOptions } from "@onegrid/core";

export interface VariableRowHeightRow {
  readonly id: string;
  readonly stage: string;
  readonly memo: string;
  readonly owner: string;
  readonly status: "Ready" | "Review" | "Blocked";
  readonly height: number;
}

export const variableRowHeightRows: readonly VariableRowHeightRow[] = Object.freeze([
  createRow("VRH-0001", "Intake", "Short request summary.", "Han", "Ready", 34),
  createRow(
    "VRH-0002",
    "Review",
    "Longer memo that needs additional vertical room while preserving column alignment across panes.",
    "Lee",
    "Review",
    72
  ),
  createRow("VRH-0003", "Approval", "Normal approval row.", "Park", "Ready", 42),
  createRow(
    "VRH-0004",
    "Exception",
    "Blocked record with a multi-line explanation for audit reviewers and accessibility smoke checks.",
    "Kang",
    "Blocked",
    84
  )
]);

export const variableRowHeightColumns: readonly ColumnDef<VariableRowHeightRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 124 },
  { field: "stage", headerName: "Stage", width: 140 },
  {
    field: "memo",
    headerName: "Memo",
    width: 360,
    style: { "white-space": "normal", "line-height": "1.35", "align-items": "center" }
  },
  { field: "owner", headerName: "Owner", width: 128 },
  { field: "status", headerName: "Status", pinned: "right", width: 136 }
];

export const variableRowHeightOptions: GridOptions<VariableRowHeightRow> = {
  columns: variableRowHeightColumns,
  data: variableRowHeightRows,
  rowKey: "id",
  rowModel: "client",
  rowHeight: (row) => row.height,
  layout: { width: "100%", height: 360, bodyHeight: 360 },
  accessibility: { label: "Variable row height grid" }
};

function createRow(
  id: string,
  stage: string,
  memo: string,
  owner: string,
  status: VariableRowHeightRow["status"],
  height: number
): VariableRowHeightRow {
  return { id, stage, memo, owner, status, height };
}
