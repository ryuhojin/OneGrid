import type { ColumnDef, ColumnUiOptions } from "@onegrid/core";

export interface ColumnUiOrderRow {
  readonly id: string;
  readonly customer: string;
  readonly region: string;
  readonly amount: number;
  readonly status: "Draft" | "Approved" | "Rejected";
  readonly owner: string;
  readonly auditNote: string;
}

export const columnUiOptions: ColumnUiOptions = {
  resize: true,
  autoSize: true,
  reorder: true,
  menu: true,
  toolPanel: true
};

export const columnUiColumns: readonly ColumnDef<ColumnUiOrderRow>[] = [
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 96, resizable: false },
  { field: "customer", headerName: "Customer", width: 150, minWidth: 120 },
  { field: "region", headerName: "Region", width: 118 },
  { field: "amount", headerName: "Amount", type: "number", width: 112, minWidth: 96 },
  { field: "owner", headerName: "Owner", width: 128 },
  { field: "auditNote", headerName: "Audit Note", hidden: true, width: 150 },
  { field: "status", headerName: "Status", width: 128 }
];

export const columnUiRows: readonly ColumnUiOrderRow[] = [
  {
    id: "ORD-4101",
    customer: "National Treasury Procurement Authority",
    region: "Seoul",
    amount: 1250000,
    status: "Approved",
    owner: "Kim",
    auditNote: "locked"
  },
  {
    id: "ORD-4102",
    customer: "Public Safety Finance Office",
    region: "Busan",
    amount: 740000,
    status: "Draft",
    owner: "Lee",
    auditNote: "review"
  },
  {
    id: "ORD-4103",
    customer: "Regional Infrastructure Fund",
    region: "Incheon",
    amount: 430000,
    status: "Rejected",
    owner: "Park",
    auditNote: "policy-hold"
  }
];
