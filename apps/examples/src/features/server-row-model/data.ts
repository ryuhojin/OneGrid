import type { ColumnDef, DataSource, GetRowsRequest, GroupMeta, RowUpdate } from "@onegrid/core";

export interface ServerOrderRow {
  readonly id: string;
  readonly customer: string;
  readonly region: "Seoul" | "Busan" | "Incheon" | "Daejeon";
  readonly amount: number;
  readonly status: "Draft" | "Approved" | "Rejected";
}

type ServerRegion = ServerOrderRow["region"];

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
      const scopedRows = applyServerGroupScope(filtered, request.groupKeys);
      const sorted = applyServerSort(scopedRows, request);
      const pageRows = sorted.slice(request.startRow, request.endRow);

      if (isRootGroupRequest(request)) {
        const groupMeta = createGroupMeta(sorted);
        return {
          rows: [],
          rowCount: groupMeta.length,
          aggregate: createAggregate(filtered),
          groupMeta,
          snapshotVersion: "server-snapshot-1"
        };
      }

      if (request.groupKeys.length > 0) {
        const region = parseRegionGroupKey(request.groupKeys[0]);
        const groupMeta = region === undefined ? [] : createExpandedGroupMeta(region, scopedRows);
        return {
          rows: pageRows,
          rowCount: scopedRows.length + groupMeta.length,
          aggregate: createAggregate(scopedRows),
          groupMeta,
          snapshotVersion: "server-snapshot-1"
        };
      }

      return {
        rows: pageRows,
        rowCount: scopedRows.length,
        aggregate: createAggregate(scopedRows),
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

function applyServerGroupScope(
  rows: readonly ServerOrderRow[],
  groupKeys: readonly string[]
): readonly ServerOrderRow[] {
  const [groupKey] = groupKeys;
  if (!groupKey) {
    return rows;
  }

  const region = parseRegionGroupKey(groupKey);
  return region === undefined ? [] : rows.filter((row) => row.region === region);
}

function isRootGroupRequest(request: GetRowsRequest): boolean {
  return request.groupKeys.length === 0 && request.groupModel.fields?.includes("region") === true;
}

function parseRegionGroupKey(groupKey: string | undefined): ServerRegion | undefined {
  if (!groupKey) {
    return undefined;
  }

  const [field, value] = groupKey.split("=");
  if (field !== "region" || !isServerRegion(value)) {
    return undefined;
  }

  return value;
}

function isServerRegion(value: string | undefined): value is ServerRegion {
  return value === "Seoul" || value === "Busan" || value === "Incheon" || value === "Daejeon";
}

function createAggregate(rows: readonly ServerOrderRow[]) {
  return { values: { amountTotal: sumAmounts(rows), orderCount: rows.length } };
}

function sumAmounts(rows: readonly ServerOrderRow[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

function createGroupMeta(rows: readonly ServerOrderRow[]): readonly GroupMeta[] {
  const groups = new Map<ServerRegion, { childCount: number; amountTotal: number }>();
  for (const row of rows) {
    const current = groups.get(row.region) ?? { childCount: 0, amountTotal: 0 };
    groups.set(row.region, {
      childCount: current.childCount + 1,
      amountTotal: current.amountTotal + row.amount
    });
  }

  return [...groups.entries()].map(([region, group]) =>
    createRegionGroupMeta(region, group.childCount, group.amountTotal, false)
  );
}

function createExpandedGroupMeta(
  region: ServerRegion,
  rows: readonly ServerOrderRow[]
): readonly GroupMeta[] {
  return [createRegionGroupMeta(region, rows.length, sumAmounts(rows), true)];
}

function createRegionGroupMeta(
  region: ServerRegion,
  childCount: number,
  amountTotal: number,
  expanded: boolean
): GroupMeta {
  return {
    key: `region=${region}`,
    field: "region",
    value: region,
    level: 0,
    expanded,
    childCount,
    aggregateValues: { amountTotal }
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
