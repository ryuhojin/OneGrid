import type { ColumnDef, GridOptions } from "@onegrid/core";

export interface KeyboardFocusRow {
  readonly id: string;
  readonly region: "Capital" | "Regional" | "Digital";
  readonly agency: string;
  readonly program: string;
  readonly memo: string;
  readonly memoSpan: boolean;
  readonly owner: string;
  readonly status: "Approved" | "Review" | "Hold";
}

export const keyboardFocusColumns: readonly ColumnDef<KeyboardFocusRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 112 },
  { field: "region", headerName: "Region", width: 132, merge: { mode: "value" } },
  { field: "agency", headerName: "Agency", width: 164, merge: { mode: "value" } },
  { field: "program", headerName: "Program", width: 168 },
  {
    field: "memo",
    headerName: "Memo",
    width: 220,
    merge: {
      mode: "custom",
      colSpan: ({ row }) => row.memoSpan ? 2 : 1
    }
  },
  { field: "owner", headerName: "Owner", width: 128 },
  { field: "status", headerName: "Status", pinned: "right", width: 132 }
];

export const keyboardFocusRows: readonly KeyboardFocusRow[] = Object.freeze([
  row("KF-0001", "Capital", "Treasury Office", "Debt Review", "Joint approval", true, "Board", "Approved"),
  row("KF-0002", "Capital", "Treasury Office", "Bond Issuance", "Joint approval", true, "Board", "Approved"),
  row("KF-0003", "Capital", "Audit Bureau", "Risk Sampling", "Desk review", false, "Lee", "Review"),
  row("KF-0004", "Regional", "Welfare Office", "Care Center", "Regional hold", false, "Choi", "Hold"),
  row("KF-0005", "Regional", "Welfare Office", "Care Staffing", "Regional hold", false, "Choi", "Hold"),
  row("KF-0006", "Digital", "Platform Team", "Records Cloud", "Security gate", false, "Kang", "Approved"),
  row("KF-0007", "Digital", "Platform Team", "Identity Sync", "Security gate", false, "Kang", "Approved"),
  row("KF-0008", "Digital", "Data Office", "Analytics Hub", "Review queue", false, "Min", "Review"),
  row("KF-0009", "Capital", "Budget Office", "Ledger Sync", "Quarter close", false, "Kim", "Approved"),
  row("KF-0010", "Capital", "Budget Office", "Cost Review", "Quarter close", false, "Kim", "Approved"),
  row("KF-0011", "Regional", "Procurement Hub", "Road Upgrade", "Field audit", false, "Park", "Review"),
  row("KF-0012", "Regional", "Procurement Hub", "Bridge Repair", "Field audit", false, "Park", "Review")
]);

export const keyboardFocusOptions: GridOptions<KeyboardFocusRow> = {
  columns: keyboardFocusColumns,
  data: keyboardFocusRows,
  rowKey: "id",
  rowModel: "client",
  rowHeight: 34,
  layout: {
    width: "100%",
    height: 360,
    bodyHeight: 360
  },
  merge: {
    enabled: true
  }
};

function row(
  id: string,
  region: KeyboardFocusRow["region"],
  agency: string,
  program: string,
  memo: string,
  memoSpan: boolean,
  owner: string,
  status: KeyboardFocusRow["status"]
): KeyboardFocusRow {
  return { id, region, agency, program, memo, memoSpan, owner, status };
}
