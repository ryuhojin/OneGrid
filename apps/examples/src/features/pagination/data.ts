import type { ColumnDef, DataSource, GridOptions } from "@onegrid/core";

export interface PaginationRow {
  readonly id: string;
  readonly region: "Capital" | "Regional" | "Digital";
  readonly agency: string;
  readonly amount: number;
  readonly status: "Approved" | "Review" | "Hold";
}

export interface PaginationStats {
  readonly requests: number;
  readonly page: string;
  readonly pageSize: string;
  readonly cursor: string;
  readonly rows: string;
}

export const paginationColumns: readonly ColumnDef<PaginationRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 120 },
  { field: "region", headerName: "Region", width: 140 },
  { field: "agency", headerName: "Agency", width: 190 },
  { field: "amount", headerName: "Amount", type: "number", width: 130 },
  { field: "status", headerName: "Status", pinned: "right", width: 130 }
];

export const paginationRows: readonly PaginationRow[] = Object.freeze(
  Array.from({ length: 18 }, (_, index) => createRow(index + 1))
);

export const clientPaginationOptions: Pick<
  GridOptions<PaginationRow>,
  "layout" | "pagination" | "rowKey" | "rowModel"
> = {
  rowKey: "id",
  rowModel: "client",
  pagination: {
    mode: "client",
    position: "bottom",
    page: 1,
    pageSize: 4,
    pageSizeOptions: [4, 6, 8],
    pageGroupSize: 4
  },
  layout: { width: "100%", height: 300, bodyHeight: 300 }
};

export const serverPaginationOptions: Pick<
  GridOptions<PaginationRow>,
  "layout" | "pagination" | "rowKey" | "rowModel" | "server"
> = {
  rowKey: "id",
  rowModel: "server",
  server: { pageSize: 5 },
  pagination: {
    mode: "server",
    position: "bottom",
    page: 1,
    pageSize: 5,
    pageSizeOptions: [5, 10],
    pageGroupSize: 5
  },
  layout: { width: "100%", height: 260, bodyHeight: 260 }
};

export const cursorPaginationOptions: Pick<
  GridOptions<PaginationRow>,
  "layout" | "pagination" | "rowKey" | "rowModel" | "server"
> = {
  rowKey: "id",
  rowModel: "server",
  server: { pageSize: 4 },
  pagination: {
    mode: "cursor",
    position: "bottom",
    page: 1,
    pageSize: 4,
    cursor: "cursor:0",
    pageSizeOptions: [4, 8]
  },
  layout: { width: "100%", height: 240, bodyHeight: 240 }
};

export const appendPaginationOptions: Pick<
  GridOptions<PaginationRow>,
  "infinite" | "layout" | "pagination" | "rowKey" | "rowModel"
> = {
  rowKey: "id",
  rowModel: "infinite",
  infinite: { blockSize: 5, initialRowCount: paginationRows.length },
  pagination: {
    mode: "append-scroll",
    position: "bottom",
    pageSize: 5,
    pageSizeOptions: [5, 10]
  },
  layout: { width: "100%", height: 230, bodyHeight: 230 }
};

export function createPaginationDataSource(
  onStats?: (stats: PaginationStats) => void
): DataSource<PaginationRow> {
  let requests = 0;
  return {
    async getRows(request) {
      requests += 1;
      const start = resolveStartRow(request.cursor, request.startRow);
      const rows = paginationRows.slice(start, request.endRow);
      const nextCursor = start + rows.length < paginationRows.length
        ? `cursor:${start + rows.length}`
        : undefined;
      onStats?.({
        requests,
        page: request.page === undefined ? "none" : String(request.page + 1),
        pageSize: request.pageSize === undefined ? "none" : String(request.pageSize),
        cursor: request.cursor ?? "none",
        rows: rows.map((row) => row.id).join(", ")
      });

      return {
        rows,
        rowCount: paginationRows.length,
        ...(nextCursor === undefined ? {} : { nextCursor }),
        hasMore: nextCursor !== undefined,
        snapshotVersion: "pagination-snapshot-1"
      };
    }
  };
}

function resolveStartRow(cursor: string | undefined, fallback: number): number {
  if (!cursor?.startsWith("cursor:")) {
    return fallback;
  }

  const parsed = Number(cursor.slice("cursor:".length));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createRow(index: number): PaginationRow {
  const regions: readonly PaginationRow["region"][] = ["Capital", "Regional", "Digital"];
  const statuses: readonly PaginationRow["status"][] = ["Approved", "Review", "Hold"];
  return {
    id: `PAGE-${String(index).padStart(4, "0")}`,
    region: regions[(index - 1) % regions.length] ?? "Capital",
    agency: `Agency ${index}`,
    amount: 500 + index * 35,
    status: statuses[(index - 1) % statuses.length] ?? "Approved"
  };
}
