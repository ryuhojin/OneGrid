import type { ColumnDef, SortingOptions } from "@onegrid/core";

export interface SortingOrderRow {
  readonly id: string;
  readonly agency: string;
  readonly service: string;
  readonly amount: number;
  readonly owner: string;
  readonly status: "Critical" | "Review" | "Ready";
}

const statusRank: Readonly<Record<SortingOrderRow["status"], number>> = {
  Critical: 0,
  Review: 1,
  Ready: 2
};

export const sortingOptions: SortingOptions = {
  enabled: true,
  multiSort: true,
  sortOrder: ["asc", "desc", null]
};

export const sortingColumns: readonly ColumnDef<SortingOrderRow>[] = [
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 118 },
  { field: "agency", headerName: "Agency", width: 220 },
  { field: "service", headerName: "Service", width: 210 },
  { field: "amount", headerName: "Amount", type: "number", width: 140 },
  { field: "owner", headerName: "Owner", width: 120 },
  {
    field: "status",
    headerName: "Status",
    pinned: "right",
    width: 132,
    sortComparator: (left, right) =>
      statusRank[left as SortingOrderRow["status"]]
        - statusRank[right as SortingOrderRow["status"]]
  }
];

export const sortingRows: readonly SortingOrderRow[] = [
  {
    id: "SO-0001",
    agency: "Treasury Board",
    service: "Budget approval",
    amount: 1200000,
    owner: "Han",
    status: "Ready"
  },
  {
    id: "SO-0002",
    agency: "Central Procurement",
    service: "Contract review",
    amount: 780000,
    owner: "Lee",
    status: "Review"
  },
  {
    id: "SO-0003",
    agency: "Regional Audit Office",
    service: "Risk sampling",
    amount: 430000,
    owner: "Park",
    status: "Critical"
  },
  {
    id: "SO-0004",
    agency: "Infrastructure Fund",
    service: "Road upgrade",
    amount: 1550000,
    owner: "Choi",
    status: "Ready"
  },
  {
    id: "SO-0005",
    agency: "Digital Records Bureau",
    service: "Identity sync",
    amount: 920000,
    owner: "Kang",
    status: "Review"
  },
  {
    id: "SO-0006",
    agency: "Public Health Office",
    service: "Clinic staffing",
    amount: 640000,
    owner: "Min",
    status: "Critical"
  }
];
