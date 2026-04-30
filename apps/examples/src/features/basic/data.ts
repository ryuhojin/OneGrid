import type { ColumnDef } from "@onegrid/core";

export interface BasicOrderRow {
  readonly id: string;
  readonly customer: string;
  readonly amount: number;
  readonly status: "Draft" | "Approved" | "Rejected";
}

export const basicColumns: readonly ColumnDef<BasicOrderRow>[] = [
  { field: "id", headerName: "ID", pinned: "left" },
  { field: "customer", headerName: "Customer" },
  { field: "amount", headerName: "Amount", type: "number" },
  { field: "status", headerName: "Status", filter: "set" }
];

export const basicRows: readonly BasicOrderRow[] = [
  { id: "ORD-1001", customer: "Han Public Office", amount: 1200000, status: "Approved" },
  { id: "ORD-1002", customer: "Korea Finance", amount: 450000, status: "Draft" },
  { id: "ORD-1003", customer: "Metro Audit Team", amount: 780000, status: "Rejected" }
];
