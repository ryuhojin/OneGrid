import type { ColumnDef, GridOptions } from "@onegrid/core";

export interface VariableRowHeightRow {
  readonly id: string;
  readonly stage: string;
  readonly memo: string;
  readonly owner: string;
  readonly status: "Ready" | "Review" | "Blocked";
}

const stages = ["Intake", "Review", "Approval", "Exception", "Audit", "Archive"] as const;
const owners = ["Han", "Lee", "Park", "Kang", "Seo", "Min"] as const;
const statuses = ["Ready", "Review", "Blocked"] as const;

export const variableRowHeightRows: readonly VariableRowHeightRow[] = Object.freeze(
  Array.from({ length: 48 }, (_, index) => createRow(
    `VRH-${String(index + 1).padStart(4, "0")}`,
    stages[index % stages.length] ?? "Review",
    getMemo(index),
    owners[index % owners.length] ?? "Han",
    statuses[index % statuses.length] ?? "Ready"
  ))
);

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
  rowHeight: "auto",
  virtualization: {
    enabled: true,
    estimatedRowHeight: 56,
    overscan: { before: 2, after: 3 },
    maxDomRows: 16
  },
  layout: { width: "100%", height: 360, bodyHeight: 360 },
  accessibility: { label: "Variable row height grid" }
};

function getMemo(index: number): string {
  if (index === 0) {
    return "Short request summary.";
  }
  if (index === 1) {
    return "Longer memo that needs additional vertical room while preserving column alignment across panes.";
  }
  if (index === 3) {
    return [
      "Blocked record with a multi-line explanation for audit reviewers, settlement owners, and accessibility checks.",
      "The row intentionally wraps across several lines so rowHeight auto can be measured from rendered DOM content.",
      "Pinned panes must keep the same measured height while the center pane owns the long memo content."
    ].join(" ");
  }

  return index % 4 === 0
    ? "Two-line operational note for variable height virtualization and scrollbar spacer validation."
    : "Normal approval row.";
}

function createRow(
  id: string,
  stage: string,
  memo: string,
  owner: string,
  status: VariableRowHeightRow["status"]
): VariableRowHeightRow {
  return { id, stage, memo, owner, status };
}
