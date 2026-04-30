import type {
  AggregateModel,
  ColumnDef,
  DataSource,
  FilterModel,
  GetRowsRequest,
  GridOptions,
  SortModel
} from "@onegrid/core";

export interface GroupingRow {
  readonly id: string;
  readonly region: "Capital" | "Regional" | "Digital";
  readonly agency: string;
  readonly program: string;
  readonly amount: number;
  readonly status: "Approved" | "Review" | "Blocked" | "Hold";
}

export interface GroupingServerStats {
  readonly requests: number;
  readonly groupKeys: string;
  readonly groupModel: string;
}

export const groupingColumns: readonly ColumnDef<GroupingRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 112 },
  { field: "region", headerName: "Region", width: 130 },
  { field: "agency", headerName: "Agency", width: 180 },
  { field: "program", headerName: "Program", width: 210 },
  {
    field: "amount",
    headerName: "Amount",
    type: "number",
    width: 120,
    summary: { kind: "sum", aggregateKey: "amountTotal", label: "Total" }
  },
  {
    field: "status",
    headerName: "Status",
    pinned: "right",
    width: 130,
    summary: { kind: "count", aggregateKey: "rowCount", label: "Rows" }
  }
];

export const groupingRows: readonly GroupingRow[] = Object.freeze([
  createRow("GRP-0001", "Capital", "Treasury Office", "Budget approval", 1200, "Approved"),
  createRow("GRP-0002", "Capital", "Treasury Office", "Bond issuance", 800, "Review"),
  createRow("GRP-0003", "Capital", "Audit Bureau", "Risk sampling", 430, "Blocked"),
  createRow("GRP-0004", "Regional", "Welfare Office", "Care center", 620, "Review"),
  createRow("GRP-0005", "Regional", "Welfare Office", "Care staffing", 530, "Hold"),
  createRow("GRP-0006", "Digital", "Platform Team", "Records cloud", 980, "Approved"),
  createRow("GRP-0007", "Digital", "Platform Team", "Identity sync", 740, "Review"),
  createRow("GRP-0008", "Digital", "Data Office", "Analytics hub", 390, "Approved")
]);

export const groupingFilterModel: FilterModel = {
  conditions: [{ field: "status", kind: "set", operator: "in", value: ["Approved", "Review"] }]
};

export const groupingSortModel: readonly SortModel[] = [
  { field: "amount", direction: "desc" }
];

export const groupingAggregateModel: AggregateModel = {
  fields: [
    { field: "amount", function: "sum", alias: "amountTotal" },
    { field: "id", function: "count", alias: "rowCount" }
  ]
};

export const clientGroupingOptions: Pick<
  GridOptions<GroupingRow>,
  "aggregation" | "filtering" | "grouping" | "layout" | "rowKey" | "rowModel" | "sorting"
> = {
  rowKey: "id",
  rowModel: "client",
  sorting: { enabled: true, model: groupingSortModel },
  filtering: { enabled: true, model: groupingFilterModel },
  grouping: {
    enabled: true,
    footer: "bottom",
    model: {
      fields: ["region"],
      expandedKeys: ["group:region=Capital", "group:region=Digital"]
    }
  },
  aggregation: { enabled: true, model: groupingAggregateModel },
  layout: { width: "100%", height: 390, bodyHeight: 390 }
};

export const serverGroupingOptions: Pick<
  GridOptions<GroupingRow>,
  "aggregation" | "filtering" | "grouping" | "layout" | "rowKey" | "rowModel" | "server" | "sorting"
> = {
  rowKey: "id",
  rowModel: "server",
  server: { pageSize: 20 },
  sorting: { enabled: true, serverOnly: true, model: groupingSortModel },
  filtering: { enabled: true, serverOnly: true, model: groupingFilterModel },
  grouping: {
    enabled: true,
    serverOnly: true,
    footer: "bottom",
    model: { fields: ["region"] }
  },
  aggregation: { enabled: true, serverOnly: true, model: groupingAggregateModel },
  layout: { width: "100%", height: 280, bodyHeight: 280 }
};

export function createGroupingDataSource(
  onStats?: (stats: GroupingServerStats) => void
): DataSource<GroupingRow> {
  let requests = 0;
  return {
    async getRows(request) {
      requests += 1;
      onStats?.({
        requests,
        groupKeys: request.groupKeys.join(" > ") || "root",
        groupModel: request.groupModel.fields?.join(", ") || "none"
      });
      return createServerGroupingResult(request);
    }
  };
}

function createServerGroupingResult(request: GetRowsRequest) {
  const rows = sortRows(filterRows(groupingRows, request.filterModel), request.sortModel);
  const groupKey = request.groupKeys[0];
  if (!groupKey) {
    const groups = getRegionGroups(rows);
    return {
      rows: [],
      rowCount: groups.length,
      groupMeta: groups.map((group) => ({
        key: group.region,
        field: "region",
        value: group.region,
        level: 0,
        childCount: group.rows.length,
        expanded: false,
        aggregateValues: aggregateRows(group.rows)
      })),
      aggregate: { values: aggregateRows(rows) }
    };
  }

  const groupRows = rows.filter((row) => row.region === groupKey);
  return {
    rows: groupRows,
    rowCount: groupRows.length + 2,
    groupMeta: [
      {
        key: groupKey,
        field: "region",
        value: groupKey,
        level: 0,
        childCount: groupRows.length,
        expanded: true,
        aggregateValues: aggregateRows(groupRows)
      },
      {
        key: groupKey,
        field: "region",
        value: groupKey,
        level: 0,
        childCount: groupRows.length,
        footer: true,
        aggregateValues: aggregateRows(groupRows)
      }
    ],
    aggregate: { values: aggregateRows(groupRows) }
  };
}

function filterRows(rows: readonly GroupingRow[], filterModel: FilterModel): readonly GroupingRow[] {
  const allowed = filterModel.conditions?.find((condition) => condition.field === "status")?.value;
  return Array.isArray(allowed)
    ? rows.filter((row) => allowed.includes(row.status))
    : rows;
}

function sortRows(rows: readonly GroupingRow[], sortModel: readonly SortModel[]): readonly GroupingRow[] {
  const amountSort = sortModel.find((sort) => sort.field === "amount");
  if (!amountSort) {
    return rows;
  }

  return [...rows].sort((left, right) =>
    amountSort.direction === "asc" ? left.amount - right.amount : right.amount - left.amount
  );
}

function getRegionGroups(rows: readonly GroupingRow[]) {
  const regions: GroupingRow["region"][] = ["Capital", "Digital", "Regional"];
  return regions
    .map((region) => ({ region, rows: rows.filter((row) => row.region === region) }))
    .filter((group) => group.rows.length > 0);
}

function aggregateRows(rows: readonly GroupingRow[]): Readonly<Record<string, unknown>> {
  return Object.freeze({
    amountTotal: rows.reduce((sum, row) => sum + row.amount, 0),
    rowCount: rows.length
  });
}

function createRow(
  id: string,
  region: GroupingRow["region"],
  agency: string,
  program: string,
  amount: number,
  status: GroupingRow["status"]
): GroupingRow {
  return { id, region, agency, program, amount, status };
}
