import type { ColumnDef } from "@onegrid/core";

export interface ColumnModelOrderRow {
  readonly id: string;
  readonly customer: string;
  readonly region: string;
  readonly amount: number;
  readonly status: "Draft" | "Approved" | "Rejected";
  readonly auditNote: string;
}

export const columnModelColumns: readonly ColumnDef<ColumnModelOrderRow>[] = [
  { id: "order-id", field: "id", headerName: "ID", pinned: "left", width: 104 },
  {
    groupId: "commercial",
    headerName: "Commercial",
    children: [
      { field: "customer", headerName: "Customer", minWidth: 180, flex: 1 },
      { field: "region", headerName: "Region", width: 120 },
      { field: "amount", headerName: "Amount", type: "number", width: 96, minWidth: 88 }
    ]
  },
  { field: "auditNote", headerName: "Audit Note", hidden: true },
  { field: "status", headerName: "Status", pinned: "right", width: 128 }
];

export const columnModelOrder: readonly string[] = [
  "status",
  "order-id",
  "customer",
  "region",
  "amount",
  "auditNote"
];

export const columnModelRows: readonly ColumnModelOrderRow[] = [
  {
    id: "ORD-2101",
    customer: "National Treasury",
    region: "Seoul",
    amount: 970000,
    status: "Approved",
    auditNote: "internal-review"
  },
  {
    id: "ORD-2102",
    customer: "Public Safety Fund",
    region: "Busan",
    amount: 425000,
    status: "Draft",
    auditNote: "requires-approval"
  },
  {
    id: "ORD-2103",
    customer: "Metro Finance Office",
    region: "Incheon",
    amount: 1350000,
    status: "Rejected",
    auditNote: "policy-hold"
  }
];
