import type { ColumnDef } from "@onegrid/core";

export interface GridApiMethodsRow {
  readonly id: string;
  readonly customer: string;
  readonly region: string;
  readonly amount: number;
  readonly owner: string;
  readonly status: "Draft" | "Review" | "Approved";
}

export const gridApiMethodsRows: readonly GridApiMethodsRow[] = [
  { id: "API-0001", customer: "Treasury Board", region: "Seoul", amount: 1200, owner: "Han", status: "Draft" },
  { id: "API-0002", customer: "Central Procurement", region: "Busan", amount: 860, owner: "Lee", status: "Review" },
  { id: "API-0003", customer: "Regional Audit", region: "Daejeon", amount: 430, owner: "Park", status: "Approved" },
  { id: "API-0004", customer: "Records Office", region: "Daegu", amount: 980, owner: "Kang", status: "Review" },
  { id: "API-0005", customer: "Public Funds", region: "Gwangju", amount: 740, owner: "Seo", status: "Draft" },
  { id: "API-0006", customer: "Welfare Review", region: "Incheon", amount: 1330, owner: "Choi", status: "Approved" }
];

export const gridApiMethodsColumns: readonly ColumnDef<GridApiMethodsRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 112 },
  { field: "customer", headerName: "Customer", width: 210 },
  { field: "region", headerName: "Region", width: 130 },
  {
    field: "amount",
    headerName: "Amount",
    type: "number",
    sortable: true,
    width: 130,
    formatter: ({ value }) => Number(value).toLocaleString("en-US")
  },
  { field: "owner", headerName: "Owner", width: 120 },
  { field: "status", headerName: "Status", filter: "set", pinned: "right", width: 132 }
];
