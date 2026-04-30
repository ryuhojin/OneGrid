import type { ColumnDef, SelectionOptions } from "@onegrid/core";

export interface SelectionRow {
  readonly id: string;
  readonly region: string;
  readonly agency: string;
  readonly program: string;
  readonly memo: string;
  readonly owner: string;
  readonly status: "Approved" | "Review" | "Hold";
}

export const selectionOptions: SelectionOptions = {
  mode: "range",
  multiple: true,
  checkbox: true,
  selectAll: "server",
  serverSelectionToken: "selection-budget"
};

export const selectionColumns: readonly ColumnDef<SelectionRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 118 },
  { field: "region", headerName: "Region", width: 138, merge: { mode: "value" } },
  { field: "agency", headerName: "Agency", width: 190, merge: { mode: "value" } },
  { field: "program", headerName: "Program", width: 210 },
  {
    field: "memo",
    headerName: "Memo",
    width: 250,
    merge: {
      mode: "custom",
      colSpan: ({ row }) => row.memo === "Joint approval" ? 2 : 1
    }
  },
  { field: "owner", headerName: "Owner", width: 120 },
  { field: "status", headerName: "Status", pinned: "right", width: 140 }
];

export const selectionRows: readonly SelectionRow[] = [
  createRow("SEL-0001", "Capital", "Treasury Office", "Budget approval", "Joint approval", "Han", "Approved"),
  createRow("SEL-0002", "Capital", "Treasury Office", "Bond issuance", "Joint approval", "Han", "Approved"),
  createRow("SEL-0003", "Capital", "Audit Bureau", "Risk sampling", "Desk review", "Lee", "Review"),
  createRow("SEL-0004", "Regional", "Welfare Office", "Care center", "Regional hold", "Choi", "Hold"),
  createRow("SEL-0005", "Regional", "Welfare Office", "Care staffing", "Regional hold", "Choi", "Hold"),
  createRow("SEL-0006", "Digital", "Platform Team", "Records cloud", "Security gate", "Kang", "Approved"),
  createRow("SEL-0007", "Digital", "Platform Team", "Identity sync", "Security gate", "Kang", "Approved"),
  createRow("SEL-0008", "Digital", "Data Office", "Analytics hub", "Review queue", "Min", "Review")
];

function createRow(
  id: string,
  region: string,
  agency: string,
  program: string,
  memo: string,
  owner: string,
  status: SelectionRow["status"]
): SelectionRow {
  return { id, region, agency, program, memo, owner, status };
}
