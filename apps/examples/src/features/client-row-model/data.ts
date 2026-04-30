import type {
  AggregateModel,
  ColumnDef,
  FilterModel,
  GroupModel,
  SortModel
} from "@onegrid/core";

export interface ClientRowModelOrderRow {
  readonly id: string;
  readonly customer: string;
  readonly region: "Seoul" | "Busan" | "Incheon";
  readonly amount: number;
  readonly status: "Draft" | "Approved" | "Rejected";
  readonly owner: string;
}

export const clientRowModelColumns: readonly ColumnDef<ClientRowModelOrderRow>[] = [
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 104 },
  { field: "customer", headerName: "Customer", width: 220 },
  { field: "region", headerName: "Region", width: 110 },
  { field: "amount", headerName: "Amount", type: "number", width: 112 },
  { field: "status", headerName: "Status", width: 118 },
  { field: "owner", headerName: "Owner", width: 104 }
];

export const clientRowModelRows: readonly ClientRowModelOrderRow[] = [
  {
    id: "ORD-5101",
    customer: "National Treasury",
    region: "Seoul",
    amount: 1250,
    status: "Approved",
    owner: "Kim"
  },
  {
    id: "ORD-5102",
    customer: "Harbor Procurement",
    region: "Busan",
    amount: 910,
    status: "Approved",
    owner: "Lee"
  },
  {
    id: "ORD-5103",
    customer: "Metro Finance Office",
    region: "Seoul",
    amount: 620,
    status: "Draft",
    owner: "Park"
  },
  {
    id: "ORD-5104",
    customer: "Audit Archive",
    region: "Incheon",
    amount: 140,
    status: "Rejected",
    owner: "Choi"
  },
  {
    id: "ORD-5105",
    customer: "Infrastructure Fund",
    region: "Incheon",
    amount: 430,
    status: "Draft",
    owner: "Han"
  }
];

export const clientRowFilterModel: FilterModel = {
  conditions: [{ field: "status", kind: "set", operator: "in", value: ["Approved", "Draft"] }]
};

export const clientRowSortModel: readonly SortModel[] = [{ field: "amount", direction: "desc" }];

export const clientRowGroupModel: GroupModel = {
  fields: ["region"],
  expandedKeys: ["group:region=Seoul", "group:region=Busan", "group:region=Incheon"]
};

export const clientRowAggregateModel: AggregateModel = {
  fields: [
    { field: "amount", function: "sum", alias: "amountTotal" },
    { field: "id", function: "count", alias: "orderCount" }
  ]
};
