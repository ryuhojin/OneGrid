import type { ColumnDef, GridOptions } from "@onegrid/core";

export interface RowVirtualizationOrder {
  readonly id: string;
  readonly account: string;
  readonly desk: string;
  readonly amount: number;
  readonly status: "Approved" | "Review" | "Pending";
}

export const ROW_VIRTUALIZATION_ROW_COUNT = 50_000;

export const rowVirtualizationColumns: readonly ColumnDef<RowVirtualizationOrder>[] = [
  { field: "id", headerName: "ID", width: 120, pinned: "left" },
  { field: "account", headerName: "Account", width: 220 },
  { field: "desk", headerName: "Desk", width: 180 },
  { field: "amount", headerName: "Amount", type: "number", width: 160 },
  { field: "status", headerName: "Status", width: 140, pinned: "right" }
];

export const rowVirtualizationRows: readonly RowVirtualizationOrder[] = Array.from(
  { length: ROW_VIRTUALIZATION_ROW_COUNT },
  (_, index) => createVirtualRow(index)
);

export const rowVirtualizationLayout = {
  width: "100%",
  height: 433,
  bodyHeight: 433
} satisfies NonNullable<GridOptions<RowVirtualizationOrder>["layout"]>;

export const rowVirtualizationVirtualization = {
  enabled: true,
  rowHeight: 32,
  overscan: { before: 3, after: 5 },
  maxDomRows: 64,
  segmented: true,
  maxScrollHeight: 24_000_000
} satisfies NonNullable<GridOptions<RowVirtualizationOrder>["virtualization"]>;

export const rowVirtualizationOptions: GridOptions<RowVirtualizationOrder> = {
  columns: rowVirtualizationColumns,
  data: rowVirtualizationRows,
  rowKey: "id",
  rowModel: "client",
  rowHeight: 32,
  layout: rowVirtualizationLayout,
  virtualization: rowVirtualizationVirtualization
};

function createVirtualRow(index: number): RowVirtualizationOrder {
  const rowNumber = index + 1;
  const statuses: readonly RowVirtualizationOrder["status"][] = ["Approved", "Review", "Pending"];
  return {
    id: `VR-${String(rowNumber).padStart(5, "0")}`,
    account: `Account ${rowNumber}`,
    desk: ["Treasury", "Public Funds", "Audit", "Procurement"][index % 4] ?? "Treasury",
    amount: 100_000 + index * 17,
    status: statuses[index % statuses.length] ?? "Pending"
  };
}
