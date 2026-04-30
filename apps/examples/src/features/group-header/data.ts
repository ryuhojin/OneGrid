import type { ColumnDef, HeaderMergeOptions } from "@onegrid/core";

export interface GroupHeaderOrderRow {
  readonly id: string;
  readonly customer: string;
  readonly amount: number;
  readonly tax: number;
  readonly status: "Draft" | "Approved" | "Rejected";
  readonly auditNote: string;
}

export const groupHeaderColumns: readonly ColumnDef<GroupHeaderOrderRow>[] = [
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 96 },
  {
    groupId: "portfolio",
    headerName: "Portfolio",
    children: [
      { field: "customer", headerName: "Customer", width: 180 },
      {
        groupId: "financial",
        headerName: "Financial",
        children: [
          { field: "amount", headerName: "Amount", type: "number", width: 112 },
          { field: "tax", headerName: "Tax", type: "number", width: 88 }
        ]
      }
    ]
  },
  { field: "auditNote", headerName: "Audit Note", hidden: true },
  { field: "status", headerName: "Status", pinned: "right", width: 128 }
];

export const groupHeaderMerge: HeaderMergeOptions = {
  rules: [
    {
      id: "financial-merge-label",
      headerName: "Financial Metrics",
      columnIds: ["amount", "tax"],
      presentation: "label"
    }
  ]
};

export const metricColumnIds: readonly string[] = ["amount", "tax"];

export const groupHeaderRows: readonly GroupHeaderOrderRow[] = [
  {
    id: "ORD-3101",
    customer: "Treasury Review Board",
    amount: 1200000,
    tax: 96000,
    status: "Approved",
    auditNote: "locked"
  },
  {
    id: "ORD-3102",
    customer: "Central Procurement",
    amount: 780000,
    tax: 62400,
    status: "Draft",
    auditNote: "pending"
  },
  {
    id: "ORD-3103",
    customer: "Regional Audit Office",
    amount: 430000,
    tax: 34400,
    status: "Rejected",
    auditNote: "blocked"
  }
];
