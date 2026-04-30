import type { ColumnDef, DataSource, GetRowsRequest, GridOptions, MergeMeta } from "@onegrid/core";

export interface CellMergeBudgetRow {
  readonly id: string;
  readonly region: "Capital" | "Regional" | "Digital";
  readonly agency: string;
  readonly program: string;
  readonly memo: string;
  readonly memoSpan: boolean;
  readonly owner: string;
  readonly amount: number;
  readonly status: "Approved" | "Review" | "Hold";
}

export const cellMergeColumns: readonly ColumnDef<CellMergeBudgetRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 116 },
  { field: "region", headerName: "Region", width: 126, merge: { mode: "value" } },
  { field: "agency", headerName: "Agency", width: 170, merge: { mode: "value" } },
  { field: "program", headerName: "Program", width: 168 },
  {
    field: "memo",
    headerName: "Memo",
    width: 230,
    merge: {
      mode: "custom",
      colSpan: ({ row }) => row.memoSpan ? 2 : 1
    }
  },
  { field: "owner", headerName: "Owner", width: 156 },
  { field: "amount", headerName: "Amount", type: "number", width: 128 },
  { field: "status", headerName: "Status", pinned: "right", width: 138 }
];

export const cellMergeRows: readonly CellMergeBudgetRow[] = Object.freeze([
  createRow("CM-0001", "Capital", "Treasury Office", "Debt Review", "Joint approval window", true, "Board", 1_240_000, "Approved"),
  createRow("CM-0002", "Capital", "Treasury Office", "Bond Issuance", "Joint approval window", true, "Board", 920_000, "Approved"),
  createRow("CM-0003", "Capital", "Audit Bureau", "Risk Sampling", "Desk review", false, "Lee", 380_000, "Review"),
  createRow("CM-0004", "Regional", "Procurement Hub", "Road Upgrade", "Regional exception", false, "Park", 740_000, "Review"),
  createRow("CM-0005", "Regional", "Welfare Office", "Care Center", "Server supplied span", false, "Choi", 560_000, "Hold"),
  createRow("CM-0006", "Regional", "Welfare Office", "Care Staffing", "Server supplied span", false, "Choi", 430_000, "Hold"),
  createRow("CM-0007", "Digital", "Platform Team", "Records Cloud", "Security gate", false, "Kang", 810_000, "Approved"),
  createRow("CM-0008", "Digital", "Platform Team", "Identity Sync", "Security gate", false, "Kang", 690_000, "Approved")
]);

export const cellMergeServerMeta: readonly MergeMeta[] = Object.freeze([
  {
    anchor: { rowIndex: 4, rowKey: "CM-0005", field: "status" },
    rowSpan: 2,
    colSpan: 1,
    value: "Server hold"
  }
]);

export const cellMergeOptions: GridOptions<CellMergeBudgetRow> = {
  columns: cellMergeColumns,
  rowKey: "id",
  rowModel: "server",
  dataSource: createCellMergeDataSource(),
  server: { pageSize: cellMergeRows.length },
  rowHeight: 36,
  layout: {
    width: "100%",
    height: 392,
    bodyHeight: 392
  },
  merge: {
    enabled: true
  }
};

export function createCellMergeDataSource(
  onRequest?: (request: GetRowsRequest) => void
): DataSource<CellMergeBudgetRow> {
  return {
    async getRows(request) {
      onRequest?.(request);
      await delay(30);
      return {
        rows: cellMergeRows.slice(request.startRow, request.endRow),
        rowCount: cellMergeRows.length,
        mergeMeta: cellMergeServerMeta,
        snapshotVersion: "cell-merge-snapshot-1"
      };
    }
  };
}

function createRow(
  id: string,
  region: CellMergeBudgetRow["region"],
  agency: string,
  program: string,
  memo: string,
  memoSpan: boolean,
  owner: string,
  amount: number,
  status: CellMergeBudgetRow["status"]
): CellMergeBudgetRow {
  return { id, region, agency, program, memo, memoSpan, owner, amount, status };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
