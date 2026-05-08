import type { ColumnDef, DataSource, GetRowsRequest } from "@onegrid/core";

export interface QspServerRow {
  readonly id: string;
  readonly agency: string;
  readonly region: "Capital" | "Regional" | "Digital" | "Audit";
  readonly amount: number;
  readonly risk: "Low" | "Medium" | "High";
  readonly status: "Open" | "Approved" | "Review";
}

export const QSP_SERVER_TOTAL_ROWS = 10_000_000;
export const QSP_SERVER_PAGE_SIZE = 128;
export const QSP_SERVER_JUMP_ROW = 9_999_990;

export const qspServerColumns: readonly ColumnDef<QspServerRow>[] = Object.freeze([
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 154 },
  { field: "agency", headerName: "Agency", width: 230 },
  { field: "region", headerName: "Region", width: 132 },
  { field: "amount", headerName: "Amount", type: "number", width: 136 },
  { field: "risk", headerName: "Risk", width: 112 },
  { field: "status", headerName: "Status", pinned: "right", width: 130 }
]);

export function createQspServerDataSource(
  onRequest?: (request: GetRowsRequest) => void
): DataSource<QspServerRow> {
  return {
    async getRows(request) {
      onRequest?.(request);
      await delay(20);
      const endRow = Math.min(request.endRow, QSP_SERVER_TOTAL_ROWS);
      return {
        rows: Array.from({ length: Math.max(0, endRow - request.startRow) }, (_, index) =>
          createQspServerRow(request.startRow + index)
        ),
        rowCount: QSP_SERVER_TOTAL_ROWS,
        snapshotVersion: "qsp-server-10m-v1"
      };
    }
  };
}

export function createQspServerRow(rowIndex: number): QspServerRow {
  const agencies = ["Treasury Office", "Audit Bureau", "Welfare Office", "Digital Platform"] as const;
  const regions = ["Capital", "Regional", "Digital", "Audit"] as const;
  const risks = ["Low", "Medium", "High"] as const;
  const statuses = ["Open", "Approved", "Review"] as const;
  return {
    id: `SRV10M-${String(rowIndex + 1).padStart(8, "0")}`,
    agency: agencies[rowIndex % agencies.length] ?? agencies[0],
    region: regions[rowIndex % regions.length] ?? regions[0],
    amount: 100_000 + (rowIndex % 10_000) * 37,
    risk: risks[rowIndex % risks.length] ?? risks[0],
    status: statuses[rowIndex % statuses.length] ?? statuses[0]
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
