import type { ColumnDef, GridOptions } from "@onegrid/core";

export interface VueWrapperRow {
  readonly id: string;
  readonly department: string;
  readonly program: string;
  readonly memo: string;
  readonly owner: string;
  readonly amount: number;
  readonly status: "Ready" | "Review" | "Blocked";
}

export const vueWrapperRows: readonly VueWrapperRow[] = Object.freeze([
  {
    id: "WV-0001",
    department: "Treasury",
    program: "Budget approval",
    memo: "Vue slot bridge",
    owner: "Han",
    amount: 1200,
    status: "Ready"
  },
  {
    id: "WV-0002",
    department: "Audit",
    program: "Risk sampling",
    memo: "Emit bridge",
    owner: "Lee",
    amount: 430,
    status: "Review"
  },
  {
    id: "WV-0003",
    department: "Digital",
    program: "Identity sync",
    memo: "Expose GridApi bridge",
    owner: "Kang",
    amount: 760,
    status: "Blocked"
  }
]);

export const vueWrapperColumns: readonly ColumnDef<VueWrapperRow>[] = Object.freeze([
  {
    field: "id",
    headerName: "ID",
    pinned: "left",
    width: 140
  },
  {
    field: "department",
    headerName: "Department",
    width: 180
  },
  {
    groupId: "workflow",
    headerName: "Workflow",
    children: [
      {
        field: "program",
        headerName: "Program",
        width: 230
      },
      {
        field: "memo",
        headerName: "Memo",
        editable: true,
        editor: "text",
        width: 240
      },
      {
        field: "owner",
        headerName: "Owner",
        width: 120
      }
    ]
  },
  {
    field: "amount",
    headerName: "Amount",
    editable: true,
    editor: "number",
    type: "number",
    width: 140
  },
  {
    field: "status",
    headerName: "Status",
    editable: true,
    editor: {
      kind: "select",
      options: [
        { value: "Ready", label: "Ready" },
        { value: "Review", label: "Review" },
        { value: "Blocked", label: "Blocked" }
      ]
    },
    pinned: "right",
    width: 150
  }
]);

export const vueWrapperOptions: Pick<
  GridOptions<VueWrapperRow>,
  "columnUi" | "editing" | "layout" | "selection"
> = {
  columnUi: { menu: true, resize: true },
  editing: { enabled: true, commitMode: "batch", blurAction: "cancel" },
  layout: { width: "100%", height: 390, bodyHeight: 300 },
  selection: { mode: "row", checkbox: true, multiple: true }
};
