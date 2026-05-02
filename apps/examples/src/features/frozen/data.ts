import type { ColumnDef, GridOptions } from "@onegrid/core";

export interface FrozenOrder {
  readonly id: string;
  readonly region: string;
  readonly agency: string;
  readonly program: string;
  readonly amount: number;
  readonly owner: string;
  readonly status: "Approved" | "Review" | "Hold";
}

export const FROZEN_ROW_COUNT = 240;
export const FROZEN_TOP_ROWS = 2;
export const FROZEN_BOTTOM_ROWS = 2;

export const frozenColumns: readonly ColumnDef<FrozenOrder>[] = [
  { field: "id", headerName: "ID", width: 124 },
  { field: "region", headerName: "Region", width: 156 },
  { field: "agency", headerName: "Agency", width: 190 },
  { field: "program", headerName: "Program", width: 220 },
  { field: "amount", headerName: "Amount", type: "number", width: 148 },
  { field: "owner", headerName: "Owner", width: 130 },
  { field: "status", headerName: "Status", width: 136 }
];

export const frozenRows: readonly FrozenOrder[] = Array.from(
  { length: FROZEN_ROW_COUNT },
  (_, index) => createFrozenOrder(index)
);

export const frozenLayout = {
  width: "100%",
  height: 460,
  bodyHeight: 460
} satisfies NonNullable<GridOptions<FrozenOrder>["layout"]>;

export const frozenVirtualization = {
  enabled: true,
  rowHeight: 32,
  overscan: { before: 3, after: 5 },
  maxDomRows: 60,
  segmented: true,
  maxScrollHeight: 2_000_000
} satisfies NonNullable<GridOptions<FrozenOrder>["virtualization"]>;

export const frozenOptions: GridOptions<FrozenOrder> = {
  columns: frozenColumns,
  data: frozenRows,
  rowKey: "id",
  rowModel: "client",
  rowHeight: 32,
  layout: frozenLayout,
  virtualization: frozenVirtualization,
  frozenRows: {
    top: FROZEN_TOP_ROWS,
    bottom: FROZEN_BOTTOM_ROWS
  },
  frozenColumns: {
    left: ["id", "region"],
    right: ["status"]
  },
  merge: {
    enabled: true,
    strategy: "value",
    fields: ["region", "agency"]
  }
};

function createFrozenOrder(index: number): FrozenOrder {
  const rowNumber = index + 1;
  const region = resolveRegion(index);
  const agency = resolveAgency(index);
  const statuses: readonly FrozenOrder["status"][] = ["Approved", "Review", "Hold"];
  return {
    id: `FR-${String(rowNumber).padStart(5, "0")}`,
    region,
    agency,
    program: resolveProgram(index),
    amount: 80_000 + index * 375,
    owner: ["Han", "Lee", "Park", "Kang", "Min"][index % 5] ?? "Han",
    status: statuses[index % statuses.length] ?? "Review"
  };
}

function resolveRegion(index: number): string {
  const group = Math.floor(index / 12) % 4;
  return ["Capital", "Regional", "Digital", "Audit"][group] ?? "Capital";
}

function resolveAgency(index: number): string {
  const group = Math.floor(index / 6) % 6;
  return [
    "Treasury Office",
    "Audit Bureau",
    "Welfare Office",
    "Platform Team",
    "Data Office",
    "Records Office"
  ][group] ?? "Treasury Office";
}

function resolveProgram(index: number): string {
  return [
    "Budget approval",
    "Bond issuance",
    "Risk sampling",
    "Care center",
    "Identity sync",
    "Records cloud"
  ][index % 6] ?? "Budget approval";
}
