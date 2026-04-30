import type {
  ColumnDef,
  DataSource,
  FilterModel,
  GetRowsRequest,
  GridOptions,
  PivotModel
} from "@onegrid/core";

export interface PivotSourceRow {
  readonly id: string;
  readonly region: "Capital" | "Regional" | "Digital";
  readonly agency: string;
  readonly quarter: "Q1" | "Q2";
  readonly amount: number;
  readonly budget: number;
  readonly status: "Open" | "Review" | "Hold" | "Blocked";
}

export type PivotResultRow = Readonly<Record<string, unknown>>;

export interface PivotServerStats {
  readonly requests: number;
  readonly rows: string;
  readonly columns: string;
  readonly values: string;
}

export const pivotSourceColumns: readonly ColumnDef<PivotSourceRow>[] = [
  { field: "id", headerName: "ID", width: 110 },
  { field: "region", headerName: "Region", width: 140 },
  { field: "agency", headerName: "Agency", width: 170 },
  { field: "quarter", headerName: "Quarter", width: 110 },
  { field: "amount", headerName: "Amount", type: "number", width: 120 },
  { field: "budget", headerName: "Budget", type: "number", width: 120 },
  { field: "status", headerName: "Status", width: 120 }
];

export const pivotRows: readonly PivotSourceRow[] = Object.freeze([
  createRow("PIV-0001", "Capital", "Treasury Office", "Q1", 1200, 900, "Open"),
  createRow("PIV-0002", "Capital", "Treasury Office", "Q2", 800, 640, "Review"),
  createRow("PIV-0003", "Capital", "Audit Bureau", "Q1", 430, 320, "Blocked"),
  createRow("PIV-0004", "Regional", "Welfare Office", "Q1", 620, 500, "Review"),
  createRow("PIV-0005", "Regional", "Welfare Office", "Q2", 530, 410, "Hold"),
  createRow("PIV-0006", "Digital", "Platform Team", "Q1", 980, 730, "Open"),
  createRow("PIV-0007", "Digital", "Platform Team", "Q2", 740, 560, "Review"),
  createRow("PIV-0008", "Digital", "Data Office", "Q2", 390, 300, "Open")
]);

export const pivotFilterModel: FilterModel = {
  conditions: [{ field: "status", kind: "set", operator: "in", value: ["Open", "Review"] }]
};

export const pivotModel: PivotModel = {
  rows: ["region", "agency"],
  columns: ["quarter"],
  values: [
    { field: "amount", function: "sum", alias: "amountTotal", label: "Amount" },
    { field: "budget", function: "avg", alias: "avgBudget", label: "Avg budget" }
  ],
  totals: "both",
  subtotals: true
};

export const clientPivotOptions: Pick<
  GridOptions<PivotSourceRow>,
  "filtering" | "layout" | "pivot" | "rowKey" | "rowModel"
> = {
  rowKey: "id",
  rowModel: "client",
  filtering: { enabled: true, model: pivotFilterModel },
  pivot: { enabled: true, panel: true, model: pivotModel },
  layout: { width: "100%", height: 430, bodyHeight: 430 }
};

export const serverPivotColumns: readonly ColumnDef<PivotResultRow>[] = [
  { field: "region", headerName: "Region", pinned: "left", width: 150 },
  { field: "agency", headerName: "Agency", width: 180 },
  {
    groupId: "server-q1",
    headerName: "Q1",
    children: [
      { field: "pivot:Q1:amountTotal", headerName: "Amount", type: "number", width: 130 },
      { field: "pivot:Q1:avgBudget", headerName: "Avg budget", type: "number", width: 130 }
    ]
  },
  {
    groupId: "server-q2",
    headerName: "Q2",
    children: [
      { field: "pivot:Q2:amountTotal", headerName: "Amount", type: "number", width: 130 },
      { field: "pivot:Q2:avgBudget", headerName: "Avg budget", type: "number", width: 130 }
    ]
  },
  {
    groupId: "server-total",
    headerName: "Total",
    children: [
      { field: "pivot:total:amountTotal", headerName: "Amount", type: "number", width: 130 },
      { field: "pivot:total:avgBudget", headerName: "Avg budget", type: "number", width: 130 }
    ]
  }
];

export const serverPivotRows: readonly PivotResultRow[] = Object.freeze([
  createServerRow("srv-capital", "Capital", "Treasury Office", 1200, 900, 800, 640, 2000, 770),
  createServerRow("srv-regional", "Regional", "Welfare Office", 620, 500, undefined, undefined, 620, 500),
  createServerRow("srv-digital-platform", "Digital", "Platform Team", 980, 730, 740, 560, 1720, 645),
  createServerRow("srv-digital-data", "Digital", "Data Office", undefined, undefined, 390, 300, 390, 300)
]);

export const serverPivotOptions: Pick<
  GridOptions<PivotResultRow>,
  "layout" | "pivot" | "rowKey" | "rowModel" | "server"
> = {
  rowKey: "__ogPivotKey",
  rowModel: "server",
  server: { pageSize: 20 },
  pivot: { enabled: true, serverOnly: true, panel: true, model: pivotModel },
  layout: { width: "100%", height: 280, bodyHeight: 280 }
};

export function createPivotDataSource(
  onStats?: (stats: PivotServerStats) => void
): DataSource<PivotResultRow> {
  let requests = 0;
  return {
    async getRows(request) {
      requests += 1;
      onStats?.({
        requests,
        rows: request.pivotModel?.rows.join(", ") ?? "none",
        columns: request.pivotModel?.columns.join(", ") ?? "none",
        values: formatValues(request)
      });
      return {
        rows: serverPivotRows.slice(request.startRow, request.endRow),
        rowCount: serverPivotRows.length,
        snapshotVersion: "pivot-snapshot-1"
      };
    }
  };
}

function formatValues(request: GetRowsRequest): string {
  return request.pivotModel?.values.map((value) =>
    typeof value === "string" ? `${value}:sum` : `${value.alias ?? value.field}:${value.function ?? "sum"}`
  ).join(", ") ?? "none";
}

function createRow(
  id: string,
  region: PivotSourceRow["region"],
  agency: string,
  quarter: PivotSourceRow["quarter"],
  amount: number,
  budget: number,
  status: PivotSourceRow["status"]
): PivotSourceRow {
  return { id, region, agency, quarter, amount, budget, status };
}

function createServerRow(
  key: string,
  region: string,
  agency: string,
  q1Amount: number | undefined,
  q1Budget: number | undefined,
  q2Amount: number | undefined,
  q2Budget: number | undefined,
  totalAmount: number,
  totalBudget: number
): PivotResultRow {
  return Object.freeze({
    __ogPivotKey: key,
    region,
    agency,
    "pivot:Q1:amountTotal": q1Amount,
    "pivot:Q1:avgBudget": q1Budget,
    "pivot:Q2:amountTotal": q2Amount,
    "pivot:Q2:avgBudget": q2Budget,
    "pivot:total:amountTotal": totalAmount,
    "pivot:total:avgBudget": totalBudget
  });
}
