import type { ClipboardOptions, ColumnDef, EditingOptions, SelectionOptions } from "@onegrid/core";

export interface ClipboardRow {
  readonly id: string;
  readonly region: string;
  readonly agency: string;
  readonly program: string;
  readonly amount: number;
  readonly memo: string;
  readonly owner: string;
  readonly status: "Approved" | "Review" | "Hold";
}

export const clipboardSelection: SelectionOptions = {
  mode: "range",
  multiple: true,
  checkbox: true
};

export const clipboardEditing: EditingOptions = {
  enabled: true,
  commitMode: "cell",
  validateOnCommit: true
};

export const clipboardOptions: ClipboardOptions = {
  enabled: true,
  includeHeaders: false,
  preserveMerge: true
};

export const clipboardColumns: readonly ColumnDef<ClipboardRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 120 },
  { field: "region", headerName: "Region", width: 150, merge: { mode: "value" } },
  { field: "agency", headerName: "Agency", width: 190, merge: { mode: "value" } },
  { field: "program", headerName: "Program", width: 220, editable: true, editor: "text" },
  {
    field: "amount",
    headerName: "Amount",
    type: "number",
    width: 140,
    editable: true,
    editor: "number",
    validator: (value) => Number(value) > 0 ? [] : ["Amount must be greater than 0"]
  },
  {
    field: "memo",
    headerName: "Memo",
    width: 230,
    editable: true,
    editor: "text",
    merge: {
      mode: "custom",
      colSpan: ({ row }) => row.memo === "Joint approval" ? 2 : 1
    }
  },
  { field: "owner", headerName: "Owner", width: 120 },
  {
    field: "status",
    headerName: "Status",
    pinned: "right",
    width: 150,
    editable: true,
    editor: {
      kind: "select",
      options: [
        { value: "Approved", label: "Approved" },
        { value: "Review", label: "Review" },
        { value: "Hold", label: "Hold" }
      ]
    }
  }
];

export const clipboardRows: readonly ClipboardRow[] = [
  createRow("CLIP-0001", "Capital", "Treasury Office", "Budget approval", 1200000, "Joint approval", "Han", "Approved"),
  createRow("CLIP-0002", "Capital", "Treasury Office", "Bond issuance", 860000, "Joint approval", "Han", "Approved"),
  createRow("CLIP-0003", "Capital", "Audit Bureau", "Risk sampling", 430000, "Desk review", "Lee", "Review"),
  createRow("CLIP-0004", "Regional", "Welfare Office", "Care center", 620000, "Regional hold", "Choi", "Hold"),
  createRow("CLIP-0005", "Regional", "Welfare Office", "Care staffing", 530000, "Regional hold", "Choi", "Hold"),
  createRow("CLIP-0006", "Digital", "Platform Team", "Records cloud", 980000, "Security gate", "Kang", "Approved"),
  createRow("CLIP-0007", "Digital", "Platform Team", "Identity sync", 740000, "Security gate", "Kang", "Approved"),
  createRow("CLIP-0008", "Digital", "Data Office", "Analytics hub", 390000, "Review queue", "Min", "Review")
];

function createRow(
  id: string,
  region: string,
  agency: string,
  program: string,
  amount: number,
  memo: string,
  owner: string,
  status: ClipboardRow["status"]
): ClipboardRow {
  return { id, region, agency, program, amount, memo, owner, status };
}
