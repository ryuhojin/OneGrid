import type { ColumnDef, DataSource, GetRowsRequest } from "@onegrid/core";

export interface QspViewportRow {
  readonly id: string;
  readonly desk: string;
  readonly instrument: string;
  readonly exposure: number;
  readonly latency: number;
  readonly status: "Active" | "Queued" | "Held";
}

export const QSP_VIEWPORT_TOTAL_ROWS = 100_000_000;
export const QSP_VIEWPORT_ROW_HEIGHT = 30;
export const QSP_VIEWPORT_SIZE = 12;
export const QSP_VIEWPORT_JUMP_ROW = 99_999_950;

export const qspViewportColumns: readonly ColumnDef<QspViewportRow>[] = Object.freeze([
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 170 },
  { field: "desk", headerName: "Desk", width: 150 },
  { field: "instrument", headerName: "Instrument", width: 210 },
  { field: "exposure", headerName: "Exposure", type: "number", width: 132 },
  { field: "latency", headerName: "Latency ms", type: "number", width: 132 },
  { field: "status", headerName: "Status", pinned: "right", width: 126 }
]);

export function createQspViewportDataSource(
  onRequest?: (request: GetRowsRequest) => void
): DataSource<QspViewportRow> {
  return {
    async getRows(request) {
      onRequest?.(request);
      await delay(16);
      const endRow = Math.min(request.endRow, QSP_VIEWPORT_TOTAL_ROWS);
      return {
        rows: Array.from({ length: Math.max(0, endRow - request.startRow) }, (_, index) =>
          createQspViewportRow(request.startRow + index)
        ),
        rowCount: QSP_VIEWPORT_TOTAL_ROWS,
        snapshotVersion: "qsp-viewport-100m-v1"
      };
    }
  };
}

export function createQspViewportRow(rowIndex: number): QspViewportRow {
  const desks = ["Treasury", "Public Funds", "Risk", "Settlement"] as const;
  const instruments = ["Bond ladder", "Cash pool", "FX hedge", "Reserve note"] as const;
  const statuses = ["Active", "Queued", "Held"] as const;
  return {
    id: `VP100M-${String(rowIndex + 1).padStart(9, "0")}`,
    desk: desks[rowIndex % desks.length] ?? desks[0],
    instrument: instruments[rowIndex % instruments.length] ?? instruments[0],
    exposure: 1_000_000 + (rowIndex % 20_000) * 29,
    latency: 8 + (rowIndex % 7),
    status: statuses[rowIndex % statuses.length] ?? statuses[0]
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
