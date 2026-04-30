import type { ColumnDef, DataSource, GetChildrenRequest } from "@onegrid/core";

export interface TreeOrderRow {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly status: "Open" | "Review" | "Closed";
  readonly hasChildren?: boolean;
  readonly children?: readonly TreeOrderRow[];
}

export const treeRowModelColumns: readonly ColumnDef<TreeOrderRow>[] = [
  { id: "name", field: "name", headerName: "Name", pinned: "left", width: 260 },
  { field: "id", headerName: "ID", width: 120 },
  { field: "owner", headerName: "Owner", width: 160 },
  { field: "status", headerName: "Status", width: 120 }
];

export const treeRows: readonly TreeOrderRow[] = [
  {
    id: "FIN",
    name: "Finance",
    owner: "Treasury",
    status: "Open",
    children: [
      { id: "FIN-AR", name: "Receivables", owner: "Treasury", status: "Review" },
      { id: "FIN-AP", name: "Payables", owner: "Treasury", status: "Open" }
    ]
  },
  {
    id: "OPS",
    name: "Operations",
    owner: "Control",
    status: "Review",
    hasChildren: true
  }
];

export function createTreeOrderDataSource(
  onChildrenRequest?: (request: GetChildrenRequest) => void
): DataSource<TreeOrderRow> {
  return {
    async getRows() {
      return { rows: treeRows, rowCount: treeRows.length };
    },
    async getChildren(request) {
      onChildrenRequest?.(request);
      await delay(60);
      return {
        rows: [
          { id: "OPS-NORTH", name: "Ops North", owner: "Control", status: "Open" },
          { id: "OPS-SOUTH", name: "Ops South", owner: "Control", status: "Closed" }
        ]
      };
    }
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
