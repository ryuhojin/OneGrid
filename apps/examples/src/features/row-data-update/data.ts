import type { ColumnDef } from "@onegrid/core";

export interface RowDataUpdateRow {
  readonly id: string;
  readonly desk: string;
  readonly amount: number;
  readonly status: "Draft" | "Review" | "Approved";
}

export const initialRowDataUpdateRows: readonly RowDataUpdateRow[] = [
  { id: "UPD-0001", desk: "Treasury", amount: 1200, status: "Draft" },
  { id: "UPD-0002", desk: "Public Funds", amount: 860, status: "Review" },
  { id: "UPD-0003", desk: "Audit", amount: 430, status: "Approved" }
];

export const rowDataUpdateColumns: readonly ColumnDef<RowDataUpdateRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 120 },
  { field: "desk", headerName: "Desk", width: 180 },
  {
    field: "amount",
    headerName: "Amount",
    type: "number",
    width: 128,
    formatter: ({ value }) => Number(value).toLocaleString("en-US")
  },
  { field: "status", headerName: "Status", filter: "set", width: 132 }
];

export function createRowDataUpdateRows(): readonly RowDataUpdateRow[] {
  return Object.freeze([...initialRowDataUpdateRows]);
}

export function createInsertedRow(): RowDataUpdateRow {
  return { id: "UPD-0004", desk: "Procurement", amount: 990, status: "Draft" };
}
