import { createClientRowModel } from "@onegrid/core";
import type { ColumnDef, DataSource, FilteringOptions, GetRowsRequest } from "@onegrid/core";

export interface FilteringOrderRow {
  readonly id: string;
  readonly agency: string;
  readonly service: string;
  readonly amount: number;
  readonly dueDate: string;
  readonly urgent: boolean;
  readonly status: "Approved" | "Review" | "Blocked";
}

export interface FilteringDataSourceStats {
  readonly filterRequests: number;
  readonly distinctRequests: number;
  readonly lastFilterModel: string;
}

export const filteringColumns: readonly ColumnDef<FilteringOrderRow>[] = [
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 112, filter: "text" },
  { field: "agency", headerName: "Agency", width: 210, filter: "text" },
  {
    field: "service",
    headerName: "Service",
    width: 230,
    filter: {
      kind: "custom",
      predicate: ({ value, filterValue }) =>
        String(value).toLocaleLowerCase().includes(String(filterValue).toLocaleLowerCase())
    }
  },
  { field: "amount", headerName: "Amount", type: "number", width: 140, filter: "number" },
  { field: "dueDate", headerName: "Due Date", type: "date", width: 150, filter: "date" },
  { field: "urgent", headerName: "Urgent", type: "boolean", width: 116, filter: "boolean" },
  {
    field: "status",
    headerName: "Status",
    pinned: "right",
    width: 136,
    filter: { kind: "set", values: ["Approved", "Review", "Blocked"] }
  }
];

export const filteringOptions: FilteringOptions = {
  enabled: true,
  quickFilter: true
};

export const filteringRows: readonly FilteringOrderRow[] = [
  {
    id: "FL-0001",
    agency: "Treasury Office",
    service: "Budget approval",
    amount: 1200000,
    dueDate: "2026-05-01",
    urgent: false,
    status: "Approved"
  },
  {
    id: "FL-0002",
    agency: "Central Procurement",
    service: "Contract review",
    amount: 780000,
    dueDate: "2026-05-12",
    urgent: true,
    status: "Review"
  },
  {
    id: "FL-0003",
    agency: "Regional Audit Office",
    service: "Risk sampling",
    amount: 430000,
    dueDate: "2026-04-24",
    urgent: true,
    status: "Blocked"
  },
  {
    id: "FL-0004",
    agency: "Infrastructure Fund",
    service: "Road upgrade",
    amount: 1550000,
    dueDate: "2026-06-03",
    urgent: false,
    status: "Approved"
  },
  {
    id: "FL-0005",
    agency: "Digital Records Bureau",
    service: "Identity sync",
    amount: 920000,
    dueDate: "2026-05-21",
    urgent: true,
    status: "Review"
  },
  {
    id: "FL-0006",
    agency: "Public Health Office",
    service: "Clinic staffing",
    amount: 640000,
    dueDate: "2026-06-01",
    urgent: false,
    status: "Approved"
  },
  {
    id: "FL-0007",
    agency: "Welfare Office",
    service: "Care center",
    amount: 710000,
    dueDate: "2026-06-10",
    urgent: true,
    status: "Blocked"
  },
  {
    id: "FL-0008",
    agency: "Platform Team",
    service: "Records cloud",
    amount: 990000,
    dueDate: "2026-05-28",
    urgent: false,
    status: "Approved"
  },
  {
    id: "FL-0009",
    agency: "Data Office",
    service: "Analytics hub",
    amount: 860000,
    dueDate: "2026-05-15",
    urgent: false,
    status: "Review"
  },
  {
    id: "FL-0010",
    agency: "Security Office",
    service: "Access review",
    amount: 540000,
    dueDate: "2026-04-18",
    urgent: true,
    status: "Blocked"
  },
  {
    id: "FL-0011",
    agency: "Transport Agency",
    service: "Depot renewal",
    amount: 1320000,
    dueDate: "2026-06-18",
    urgent: false,
    status: "Approved"
  },
  {
    id: "FL-0012",
    agency: "Revenue Office",
    service: "Tax portal",
    amount: 1080000,
    dueDate: "2026-05-30",
    urgent: true,
    status: "Review"
  }
];

export function createFilteringDataSource(
  onStats?: (stats: FilteringDataSourceStats) => void
): DataSource<FilteringOrderRow> {
  let filterRequests = 0;
  let distinctRequests = 0;
  let lastFilterModel = "none";

  const emit = (): void => {
    onStats?.({ filterRequests, distinctRequests, lastFilterModel });
  };

  return {
    async getRows(request) {
      filterRequests += 1;
      lastFilterModel = formatFilterModel(request);
      emit();
      const model = createClientRowModel(filteringRows, {
        columns: filteringColumns,
        rowKey: "id",
        filterModel: request.filterModel,
        sortModel: request.sortModel
      });
      const rows = model.visibleRows
        .filter((entry) => entry.kind === "data")
        .map((entry) => entry.data)
        .slice(request.startRow, request.endRow);

      return {
        rows,
        rowCount: model.dataRowCount
      };
    },
    async getDistinctValues(request) {
      distinctRequests += 1;
      emit();
      const values = [
        ...new Set(filteringRows.map((row) => readField(row, request.field)))
      ].filter((value) => value !== undefined);
      return { values };
    }
  };
}

function formatFilterModel(request: GetRowsRequest): string {
  const model = request.filterModel;
  if (!model.quickText && !model.conditions?.length) {
    return "none";
  }

  const parts = [
    ...(model.quickText ? [`quick:${model.quickText}`] : []),
    ...(model.conditions ?? []).map((condition) =>
      `${condition.field}:${condition.operator}:${String(condition.value)}`
    )
  ];

  return parts.join(", ");
}

function readField(row: FilteringOrderRow, field: string): unknown {
  return row[field as keyof FilteringOrderRow];
}
