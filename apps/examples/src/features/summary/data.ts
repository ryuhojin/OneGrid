import type {
  AggregateModel,
  ColumnDef,
  DataSource,
  GetRowsRequest,
  GridOptions
} from "@onegrid/core";

export interface SummaryRow {
  readonly id: string;
  readonly region: "Capital" | "Regional" | "Digital";
  readonly agency: string;
  readonly program: string;
  readonly amount: number;
  readonly spent: number;
  readonly riskScore: number;
  readonly status: "Approved" | "Review" | "Blocked";
}

export interface SummaryServerStats {
  readonly requests: number;
  readonly lastAggregateModel: string;
}

export const summaryColumns: readonly ColumnDef<SummaryRow>[] = [
  {
    field: "id",
    headerName: "ID",
    pinned: "left",
    width: 120,
    summary: { kind: "count", aggregateKey: "rowCount", label: "Rows" }
  },
  {
    field: "region",
    headerName: "Region",
    width: 130,
    summary: { kind: "distinct-count", aggregateKey: "regionDistinct", label: "Regions" }
  },
  { field: "agency", headerName: "Agency", width: 170 },
  { field: "program", headerName: "Program", width: 190 },
  {
    field: "amount",
    headerName: "Amount",
    type: "number",
    width: 120,
    summary: { kind: "sum", aggregateKey: "amountTotal", label: "Total" }
  },
  {
    field: "spent",
    headerName: "Avg spent",
    type: "number",
    width: 120,
    summary: { kind: "avg", aggregateKey: "avgSpent", label: "Avg" }
  },
  {
    id: "min-risk",
    field: "riskScore",
    headerName: "Min risk",
    width: 110,
    summary: { kind: "min", aggregateKey: "minRisk", label: "Min" }
  },
  {
    id: "max-risk",
    field: "riskScore",
    headerName: "Max risk",
    width: 110,
    summary: { kind: "max", aggregateKey: "maxRisk", label: "Max" }
  },
  {
    field: "status",
    headerName: "Status",
    pinned: "right",
    width: 140,
    summary: {
      kind: "custom",
      label: "Reviews",
      aggregateKey: "reviewRows",
      calculate: (rows) => rows.filter((row) => row.status === "Review").length
    }
  }
];

export const summaryRows: readonly SummaryRow[] = [
  createRow("SUM-0001", "Capital", "Treasury Office", "Budget approval", 1200, 900, 12, "Approved"),
  createRow("SUM-0002", "Capital", "Treasury Office", "Bond issuance", 800, 640, 18, "Review"),
  createRow("SUM-0003", "Capital", "Audit Bureau", "Risk sampling", 430, 320, 35, "Blocked"),
  createRow("SUM-0004", "Regional", "Welfare Office", "Care center", 620, 500, 28, "Review"),
  createRow("SUM-0005", "Regional", "Welfare Office", "Care staffing", 530, 430, 25, "Approved"),
  createRow("SUM-0006", "Digital", "Platform Team", "Records cloud", 980, 760, 16, "Approved"),
  createRow("SUM-0007", "Digital", "Platform Team", "Identity sync", 740, 610, 21, "Review"),
  createRow("SUM-0008", "Digital", "Data Office", "Analytics hub", 390, 300, 42, "Blocked")
];

export const summaryAggregateModel: AggregateModel = {
  fields: [
    { field: "amount", function: "sum", alias: "amountTotal" },
    { field: "spent", function: "avg", alias: "avgSpent" },
    { field: "riskScore", function: "min", alias: "minRisk" },
    { field: "riskScore", function: "max", alias: "maxRisk" },
    { field: "region", function: "distinct-count", alias: "regionDistinct" },
    { field: "id", function: "count", alias: "rowCount" }
  ]
};

export const clientSummaryOptions: Pick<
  GridOptions<SummaryRow>,
  "grouping" | "aggregation" | "summary" | "layout" | "rowKey" | "rowModel"
> = {
  rowKey: "id",
  rowModel: "client",
  grouping: {
    enabled: true,
    model: {
      fields: ["region"],
      expandedKeys: [
        "group:region=Capital",
        "group:region=Regional",
        "group:region=Digital"
      ]
    }
  },
  aggregation: {
    enabled: true,
    model: summaryAggregateModel
  },
  summary: {
    enabled: true,
    position: "top",
    sticky: true
  },
  layout: {
    width: "100%",
    height: 370,
    bodyHeight: 370
  }
};

export const serverSummaryOptions: Pick<
  GridOptions<SummaryRow>,
  "aggregation" | "summary" | "layout" | "rowKey" | "rowModel" | "server"
> = {
  rowKey: "id",
  rowModel: "server",
  server: { pageSize: 4 },
  aggregation: {
    enabled: true,
    serverOnly: true,
    model: summaryAggregateModel
  },
  summary: {
    enabled: true,
    position: "bottom"
  },
  layout: {
    width: "100%",
    height: 280,
    bodyHeight: 280
  }
};

export function createSummaryDataSource(
  onStats?: (stats: SummaryServerStats) => void
): DataSource<SummaryRow> {
  let requests = 0;
  return {
    async getRows(request) {
      requests += 1;
      onStats?.({
        requests,
        lastAggregateModel: formatAggregateModel(request)
      });
      return {
        rows: summaryRows.slice(request.startRow, request.endRow),
        rowCount: summaryRows.length,
        aggregate: { values: calculateAggregateValues(summaryRows, request) },
        snapshotVersion: "summary-snapshot-1"
      };
    },
    async getAggregates(request) {
      return {
        values: calculateAggregateValues(summaryRows, request)
      };
    }
  };
}

function calculateAggregateValues(
  rows: readonly SummaryRow[],
  request: Pick<GetRowsRequest, "aggregateModel">
): Readonly<Record<string, unknown>> {
  const values: Record<string, unknown> = {};
  for (const field of request.aggregateModel?.fields ?? []) {
    const alias = field.alias ?? `${field.function}:${field.field}`;
    values[alias] = calculateFieldAggregate(rows, field.field, field.function);
  }
  values.reviewRows = rows.filter((row) => row.status === "Review").length;
  return Object.freeze(values);
}

function calculateFieldAggregate(
  rows: readonly SummaryRow[],
  field: string,
  fn: string
): unknown {
  const values = rows.map((row) => row[field as keyof SummaryRow]);
  if (fn === "count") return rows.length;
  if (fn === "distinct-count") return new Set(values).size;
  const numbers = values.map(Number).filter(Number.isFinite);
  if (fn === "sum") return numbers.reduce((sum, value) => sum + value, 0);
  if (fn === "avg") return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  if (fn === "min") return Math.min(...numbers);
  if (fn === "max") return Math.max(...numbers);
  return undefined;
}

function formatAggregateModel(request: GetRowsRequest): string {
  return (request.aggregateModel?.fields ?? [])
    .map((field) => `${field.alias ?? field.field}:${field.function}`)
    .join(", ") || "none";
}

function createRow(
  id: string,
  region: SummaryRow["region"],
  agency: string,
  program: string,
  amount: number,
  spent: number,
  riskScore: number,
  status: SummaryRow["status"]
): SummaryRow {
  return { id, region, agency, program, amount, spent, riskScore, status };
}
