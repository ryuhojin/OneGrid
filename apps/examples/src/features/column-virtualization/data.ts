import type { ColumnDef, GridOptions } from "@onegrid/core";

export interface ColumnVirtualizationOrder {
  readonly id: string;
  readonly desk: string;
  readonly status: "Approved" | "Review" | "Blocked";
  readonly [key: string]: string | number;
}

export const COLUMN_VIRTUALIZATION_CENTER_COLUMNS = 72;

const metricGroups = [
  { id: "risk", headerName: "Risk Metrics", start: 1, end: 24 },
  { id: "liquidity", headerName: "Liquidity Metrics", start: 25, end: 48 },
  { id: "forecast", headerName: "Forecast Metrics", start: 49, end: 72 }
] as const;

export const columnVirtualizationColumns: readonly ColumnDef<ColumnVirtualizationOrder>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 116 },
  { field: "desk", headerName: "Desk", pinned: "left", width: 148 },
  ...metricGroups.map((group) => ({
    groupId: group.id,
    headerName: group.headerName,
    children: createMetricColumns(group.start, group.end)
  })),
  { field: "status", headerName: "Status", pinned: "right", width: 132 }
];

export const columnVirtualizationRows: readonly ColumnVirtualizationOrder[] = Array.from(
  { length: 32 },
  (_, index) => createOrder(index)
);

export const columnVirtualizationLayout = {
  width: "100%",
  height: 392,
  bodyHeight: 392
} satisfies NonNullable<GridOptions<ColumnVirtualizationOrder>["layout"]>;

export const columnVirtualizationVirtualization = {
  enabled: true,
  columns: {
    enabled: true,
    overscan: { before: 1, after: 2 },
    maxDomColumns: 10
  }
} satisfies NonNullable<GridOptions<ColumnVirtualizationOrder>["virtualization"]>;

export const columnVirtualizationOptions: GridOptions<ColumnVirtualizationOrder> = {
  columns: columnVirtualizationColumns,
  data: columnVirtualizationRows,
  rowKey: "id",
  rowModel: "client",
  rowHeight: 32,
  layout: columnVirtualizationLayout,
  virtualization: columnVirtualizationVirtualization
};

function createMetricColumns(
  start: number,
  end: number
): readonly ColumnDef<ColumnVirtualizationOrder>[] {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const metricIndex = start + index;
    return {
      field: `metric${metricIndex}`,
      headerName: `M${metricIndex}`,
      type: "number",
      width: metricIndex % 3 === 0 ? 136 : 124
    };
  });
}

function createOrder(index: number): ColumnVirtualizationOrder {
  const rowNumber = index + 1;
  const row: Record<string, string | number> = {
    id: `CV-${String(rowNumber).padStart(4, "0")}`,
    desk: ["Treasury", "Public Funds", "Audit", "Procurement"][index % 4] ?? "Treasury",
    status: ["Approved", "Review", "Blocked"][index % 3] ?? "Review"
  };

  for (let metricIndex = 1; metricIndex <= COLUMN_VIRTUALIZATION_CENTER_COLUMNS; metricIndex += 1) {
    row[`metric${metricIndex}`] = 1_000 + rowNumber * 7 + metricIndex * 11;
  }

  return row as ColumnVirtualizationOrder;
}
