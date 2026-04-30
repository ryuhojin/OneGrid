import type { ColumnDef, DataSource, GetRowsRequest } from "@onegrid/core";

export interface InfiniteOrderRow {
  readonly id: string;
  readonly customer: string;
  readonly region: string;
  readonly amount: number;
  readonly status: "Draft" | "Approved" | "Rejected";
}

export const INFINITE_TOTAL_ROWS = 1_000_000;
export const INFINITE_BLOCK_SIZE = 20;

export const infiniteRowModelColumns: readonly ColumnDef<InfiniteOrderRow>[] = [
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 112 },
  { field: "customer", headerName: "Customer", width: 220 },
  { field: "region", headerName: "Region", width: 112 },
  { field: "amount", headerName: "Amount", type: "number", width: 112 },
  { field: "status", headerName: "Status", width: 120 }
];

export function createInfiniteOrderDataSource(
  onRequest?: (request: GetRowsRequest) => void
): DataSource<InfiniteOrderRow> {
  return {
    async getRows(request) {
      onRequest?.(request);
      await delay(80);
      request.signal?.throwIfAborted?.();
      const endRow = Math.min(request.endRow, INFINITE_TOTAL_ROWS);

      return {
        rows: Array.from({ length: Math.max(0, endRow - request.startRow) }, (_, index) =>
          createRow(request.startRow + index)
        ),
        rowCount: INFINITE_TOTAL_ROWS,
        hasMore: endRow < INFINITE_TOTAL_ROWS
      };
    }
  };
}

function createRow(rowIndex: number): InfiniteOrderRow {
  const regions = ["Seoul", "Busan", "Incheon", "Daejeon"] as const;
  const statuses = ["Approved", "Draft", "Rejected"] as const;
  return {
    id: `ORD-${String(rowIndex + 1).padStart(7, "0")}`,
    customer: `Public Account ${rowIndex + 1}`,
    region: regions[rowIndex % regions.length] ?? regions[0],
    amount: 1000 + rowIndex * 17,
    status: statuses[rowIndex % statuses.length] ?? statuses[0]
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
