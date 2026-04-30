import type { ColumnDef, DataSource, GetRowsRequest } from "@onegrid/core";

export interface ViewportOrderRow {
  readonly id: string;
  readonly customer: string;
  readonly desk: string;
  readonly amount: number;
  readonly status: "Open" | "Matched" | "Held";
}

export const VIEWPORT_TOTAL_ROWS = 10_000_000;
export const VIEWPORT_ROW_HEIGHT = 30;
export const VIEWPORT_SIZE = 8;
export const VIEWPORT_JUMP_ROW = 5000;

export const viewportRowModelColumns: readonly ColumnDef<ViewportOrderRow>[] = [
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 132 },
  { field: "customer", headerName: "Customer", width: 220 },
  { field: "desk", headerName: "Desk", width: 120 },
  { field: "amount", headerName: "Amount", type: "number", width: 112 },
  { field: "status", headerName: "Status", width: 120 }
];

export function createViewportOrderDataSource(
  onRequest?: (request: GetRowsRequest) => void
): DataSource<ViewportOrderRow> {
  return {
    async getRows(request) {
      onRequest?.(request);
      await delay(60);
      const endRow = Math.min(request.endRow, VIEWPORT_TOTAL_ROWS);
      return {
        rows: Array.from({ length: Math.max(0, endRow - request.startRow) }, (_, index) =>
          createViewportOrderRow(request.startRow + index)
        ),
        rowCount: VIEWPORT_TOTAL_ROWS,
        snapshotVersion: "viewport-snapshot-1"
      };
    }
  };
}

export function createViewportOrderRow(
  rowIndex: number,
  customer = `Viewport Account ${rowIndex + 1}`
): ViewportOrderRow {
  const desks = ["Treasury", "Risk", "Audit", "Settlement"] as const;
  const statuses = ["Open", "Matched", "Held"] as const;
  return {
    id: `ORD-VP-${String(rowIndex + 1).padStart(7, "0")}`,
    customer,
    desk: desks[rowIndex % desks.length] ?? desks[0],
    amount: 50_000 + rowIndex * 11,
    status: statuses[rowIndex % statuses.length] ?? statuses[0]
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
