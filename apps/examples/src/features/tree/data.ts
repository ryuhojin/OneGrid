import type { ColumnDef, DataSource, FilterModel, GetChildrenRequest, GridOptions, SortModel } from "@onegrid/core";

export interface TreeFeatureRow {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly status: "Open" | "Review" | "Hold" | "Blocked";
  readonly budget: number;
  readonly hasChildren?: boolean;
  readonly children?: readonly TreeFeatureRow[];
}

export interface TreeServerStats {
  readonly requests: number;
  readonly parentKey: string;
  readonly sort: string;
  readonly filter: string;
}

export const treeFeatureColumns: readonly ColumnDef<TreeFeatureRow>[] = [
  { id: "name", field: "name", headerName: "Workstream", pinned: "left", width: 300 },
  { field: "id", headerName: "ID", width: 140 },
  { field: "owner", headerName: "Owner", width: 160 },
  { field: "budget", headerName: "Budget", width: 130 },
  { field: "status", headerName: "Status", pinned: "right", width: 140 }
];

export const clientTreeRows: readonly TreeFeatureRow[] = [
  {
    id: "CAP",
    name: "Capital Programs",
    owner: "Treasury",
    status: "Open",
    budget: 900,
    children: [
      { id: "CAP-BUD", name: "Budget approval", owner: "Treasury", status: "Review", budget: 460 },
      { id: "CAP-BOND", name: "Bond issuance", owner: "Treasury", status: "Open", budget: 760 },
      { id: "CAP-RISK", name: "Risk sampling", owner: "Audit", status: "Blocked", budget: 180 }
    ]
  },
  {
    id: "REG",
    name: "Regional Services",
    owner: "Welfare",
    status: "Review",
    budget: 500,
    children: [
      { id: "REG-CARE", name: "Care center", owner: "Welfare", status: "Open", budget: 640 },
      { id: "REG-STAFF", name: "Care staffing", owner: "Welfare", status: "Hold", budget: 420 }
    ]
  },
  {
    id: "DIG",
    name: "Digital Platforms",
    owner: "Platform",
    status: "Open",
    budget: 820,
    children: [
      { id: "DIG-REC", name: "Records cloud", owner: "Platform", status: "Open", budget: 730 },
      { id: "DIG-ID", name: "Identity sync", owner: "Platform", status: "Review", budget: 680 },
      {
        id: "DIG-AUD",
        name: "Audit archive",
        owner: "Platform",
        status: "Open",
        budget: 510,
        hasChildren: true
      }
    ]
  }
];

export const serverTreeRows: readonly TreeFeatureRow[] = [
  { id: "SRV-CAP", name: "Server Capital", owner: "Treasury", status: "Open", budget: 900, hasChildren: true },
  { id: "SRV-DIG", name: "Server Digital", owner: "Platform", status: "Review", budget: 820, hasChildren: true }
];

export const clientTreeOptions: Partial<GridOptions<TreeFeatureRow>> = {
  rowModel: "tree",
  rowKey: "id",
  sorting: { enabled: true, model: [{ field: "budget", direction: "desc" }] },
  filtering: { enabled: true },
  tree: {
    treeColumnField: "name",
    childrenField: "children",
    hasChildrenField: "hasChildren",
    lazy: true,
    expandedKeys: ["CAP", "DIG"],
    filterPolicy: "withAncestors",
    sortPolicy: "siblings",
    selection: { policy: "descendants" }
  },
  layout: { height: 420 },
  virtualization: { enabled: false, columns: { enabled: false } }
};

export const serverTreeOptions: Partial<GridOptions<TreeFeatureRow>> = {
  rowModel: "tree",
  rowKey: "id",
  sorting: { enabled: true, model: [{ field: "budget", direction: "desc" }] },
  filtering: {
    enabled: true,
    model: { conditions: [{ field: "status", kind: "set", operator: "in", value: ["Open", "Review"] }] }
  },
  tree: {
    treeColumnField: "name",
    hasChildrenField: "hasChildren",
    lazy: true,
    serverOnly: true,
    sortPolicy: "siblings",
    selection: { policy: "descendants" }
  },
  layout: { height: 280 },
  virtualization: { enabled: false, columns: { enabled: false } }
};

export function createTreeFeatureDataSource(
  onClientChildrenRequest?: () => void
): DataSource<TreeFeatureRow> {
  return {
    async getRows() {
      return { rows: clientTreeRows, rowCount: clientTreeRows.length };
    },
    async getChildren(request) {
      onClientChildrenRequest?.();
      await delay(40);
      return {
        rows: request.parentKey === "DIG-AUD"
          ? [
              { id: "DIG-AUD-2026", name: "Archive 2026", owner: "Audit", status: "Open", budget: 260 },
              { id: "DIG-AUD-LOG", name: "Access logs", owner: "Security", status: "Review", budget: 210 }
            ]
          : []
      };
    }
  };
}

export function createServerTreeDataSource(
  onStats?: (stats: TreeServerStats) => void
): DataSource<TreeFeatureRow> {
  let requests = 0;
  return {
    async getRows() {
      return { rows: serverTreeRows, rowCount: serverTreeRows.length };
    },
    async getChildren(request) {
      requests += 1;
      const rows = sortRows(filterRows(serverChildren[String(request.parentKey)] ?? [], request.filterModel), request.sortModel);
      onStats?.({
        requests,
        parentKey: String(request.parentKey),
        sort: formatSort(request.sortModel),
        filter: formatFilter(request.filterModel)
      });
      await delay(40);
      return { rows, rowCount: rows.length };
    }
  };
}

const serverChildren: Readonly<Record<string, readonly TreeFeatureRow[]>> = {
  "SRV-CAP": [
    { id: "SRV-CAP-BUD", name: "Server budget approval", owner: "Treasury", status: "Review", budget: 460 },
    { id: "SRV-CAP-BOND", name: "Server bond issuance", owner: "Treasury", status: "Open", budget: 760 },
    { id: "SRV-CAP-RISK", name: "Server risk sampling", owner: "Audit", status: "Blocked", budget: 180 }
  ],
  "SRV-DIG": [
    { id: "SRV-DIG-REC", name: "Server records cloud", owner: "Platform", status: "Open", budget: 730 },
    { id: "SRV-DIG-ID", name: "Server identity sync", owner: "Platform", status: "Review", budget: 680 }
  ]
};

function filterRows(rows: readonly TreeFeatureRow[], model: FilterModel | undefined): readonly TreeFeatureRow[] {
  const statusCondition = model?.conditions?.find((condition) => condition.field === "status");
  if (!statusCondition) {
    return rows;
  }

  const values = Array.isArray(statusCondition.value) ? statusCondition.value : [statusCondition.value];
  return rows.filter((row) => values.includes(row.status));
}

function sortRows(rows: readonly TreeFeatureRow[], model: readonly SortModel[] | undefined): readonly TreeFeatureRow[] {
  const sort = model?.[0];
  if (!sort) {
    return rows;
  }

  return Object.freeze([...rows].sort((left, right) =>
    sort.direction === "desc"
      ? Number(right[sort.field as keyof TreeFeatureRow]) - Number(left[sort.field as keyof TreeFeatureRow])
      : Number(left[sort.field as keyof TreeFeatureRow]) - Number(right[sort.field as keyof TreeFeatureRow])
  ));
}

function formatSort(model: GetChildrenRequest["sortModel"]): string {
  return model?.map((sort) => `${sort.field}:${sort.direction}`).join(", ") || "none";
}

function formatFilter(model: GetChildrenRequest["filterModel"]): string {
  return model?.conditions?.map((condition) => `${condition.field}:${String(condition.value)}`).join(", ") || "none";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
