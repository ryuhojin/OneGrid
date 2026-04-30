import type { ColumnDef, GridOptions } from "@onegrid/core";

export interface BaseLayoutOrderRow {
  readonly id: string;
  readonly customer: string;
  readonly desk: string;
  readonly amount: number;
  readonly tax: number;
  readonly status: "Approved" | "Draft" | "Rejected";
}

export const baseLayoutColumns: readonly ColumnDef<BaseLayoutOrderRow>[] = [
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 104 },
  { field: "customer", headerName: "Customer", width: 220 },
  { field: "desk", headerName: "Desk", width: 150 },
  { field: "amount", headerName: "Amount", type: "number", width: 140, summary: "sum" },
  { field: "tax", headerName: "Tax", type: "number", width: 120, summary: "sum" },
  { field: "status", headerName: "Status", pinned: "right", width: 132 }
];

export const baseLayoutRows: readonly BaseLayoutOrderRow[] = [
  {
    id: "ORD-7001",
    customer: "Treasury Review Board",
    desk: "Capital",
    amount: 1_200_000,
    tax: 96_000,
    status: "Approved"
  },
  {
    id: "ORD-7002",
    customer: "Central Procurement",
    desk: "Operations",
    amount: 780_000,
    tax: 62_400,
    status: "Draft"
  },
  {
    id: "ORD-7003",
    customer: "Regional Audit Office",
    desk: "Audit",
    amount: 430_000,
    tax: 34_400,
    status: "Rejected"
  },
  {
    id: "ORD-7004",
    customer: "Public Infrastructure Fund",
    desk: "Planning",
    amount: 960_000,
    tax: 76_800,
    status: "Approved"
  }
];

export const baseLayoutOptions: Pick<
  GridOptions<BaseLayoutOrderRow>,
  "layout" | "summary" | "rowKey" | "rowModel"
> = {
  rowKey: "id",
  rowModel: "client",
  layout: {
    width: "100%",
    height: 360,
    bodyHeight: 360
  },
  summary: {
    enabled: true,
    position: "bottom",
    sticky: true
  }
};
