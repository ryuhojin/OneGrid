import type { ColumnDef, DataSource, GetRowsRequest, RowUpdate } from "@onegrid/core";

export interface ServerOrderRow {
  readonly id: string;
  readonly customer: string;
  readonly region: "Seoul" | "Busan" | "Incheon" | "Daejeon";
  readonly amount: number;
  readonly status: "Draft" | "Approved" | "Rejected";
}

export const SERVER_ROW_MODEL_PAGE_SIZE = 10;
export const SERVER_UPDATED_ROW_ID = "ORD-SRV-0040";

export const serverRowModelColumns: readonly ColumnDef<ServerOrderRow>[] = [
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 132 },
  { field: "customer", headerName: "Customer", width: 230 },
  { field: "region", headerName: "Region", width: 112 },
  { field: "amount", headerName: "Amount", type: "number", width: 112 },
  { field: "status", headerName: "Status", width: 120 }
];

export function createServerOrderDataSource(
  onRequest?: (request: GetRowsRequest) => void,
  onUpdate?: (updates: readonly RowUpdate<ServerOrderRow>[]) => void
): DataSource<ServerOrderRow> {
  let rows = createRows(40);

  return {
    async getRows(request) {
      onRequest?.(request);
      await delay(60);
      const filtered = applyServerFilter(rows);
      const sorted = applyServerSort(filtered, request);
      const pageRows = sorted.slice(request.startRow, request.endRow);

      return {
        rows: pageRows,
        rowCount: filtered.length,
        aggregate: { values: { amountTotal: sumAmounts(filtered), orderCount: filtered.length } },
        groupMeta: createGroupMeta(filtered),
        snapshotVersion: "server-snapshot-1"
      };
    },
    async updateRows(request) {
      onUpdate?.(request.updates);
      const updatedRows: ServerOrderRow[] = [];
      rows = rows.map((row) => {
        const update = request.updates.find((item) => item.rowKey === row.id);
        if (!update) {
          return row;
        }

        const nextRow = { ...row, ...update.row };
        updatedRows.push(nextRow);
        return nextRow;
      });
      return { rows: updatedRows };
    }
  };
}

function createRows(count: number): readonly ServerOrderRow[] {
  const regions = ["Seoul", "Busan", "Incheon", "Daejeon"] as const;
  const statuses = ["Approved", "Draft", "Rejected"] as const;
  return Object.freeze(
    Array.from({ length: count }, (_, index) => ({
      id: `ORD-SRV-${String(index + 1).padStart(4, "0")}`,
      customer: `Public Sector ${index + 1}`,
      region: regions[index % regions.length] ?? regions[0],
      amount: 10_000 + index * 325,
      status: statuses[index % statuses.length] ?? statuses[0]
    }))
  );
}

function applyServerFilter(rows: readonly ServerOrderRow[]): readonly ServerOrderRow[] {
  return rows.filter((row) => row.status !== "Rejected");
}

function applyServerSort(
  rows: readonly ServerOrderRow[],
  request: GetRowsRequest
): readonly ServerOrderRow[] {
  const [sort] = request.sortModel;
  if (!sort) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const direction = sort.direction === "desc" ? -1 : 1;
    return (readComparable(left, sort.field) > readComparable(right, sort.field) ? 1 : -1) * direction;
  });
}

function readComparable(row: ServerOrderRow, field: string): string | number {
  return field === "amount" ? row.amount : String(row[field as keyof ServerOrderRow] ?? "");
}

function sumAmounts(rows: readonly ServerOrderRow[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

function createGroupMeta(rows: readonly ServerOrderRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.region, (counts.get(row.region) ?? 0) + 1));
  return [...counts.entries()].map(([region, childCount]) => ({
    key: `region=${region}`,
    level: 0,
    expanded: true,
    childCount
  }));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
