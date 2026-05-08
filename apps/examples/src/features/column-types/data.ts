import type {
  ColumnDef,
  ColumnTypeRegistry,
  DataColumnDefaults,
  RenderElement,
  RenderElementBuilder
} from "@onegrid/core";

export interface ColumnTypesRow {
  readonly id: string;
  readonly department: string;
  readonly requestedAt: string;
  readonly amount: number;
  readonly progress: number;
  readonly active: boolean;
  readonly risk: "Low" | "Medium" | "High";
}

export const columnTypesRows: readonly ColumnTypesRow[] = [
  {
    id: "CT-0001",
    department: "Treasury",
    requestedAt: "2026-05-01",
    amount: 1280000,
    progress: 82,
    active: true,
    risk: "Low"
  },
  {
    id: "CT-0002",
    department: "Procurement",
    requestedAt: "2026-05-03",
    amount: 760000,
    progress: 41,
    active: true,
    risk: "Medium"
  },
  {
    id: "CT-0003",
    department: "Audit",
    requestedAt: "2026-05-04",
    amount: 430000,
    progress: 18,
    active: false,
    risk: "High"
  },
  {
    id: "CT-0004",
    department: "Records",
    requestedAt: "2026-05-05",
    amount: 980000,
    progress: 64,
    active: true,
    risk: "Medium"
  }
];

export const columnTypesDefaultColumnDef = defineColumnDefaults<ColumnTypesRow>({
  type: "text",
  minWidth: 112,
  resizable: true,
  sortable: true,
  filter: "text"
});

export const columnTypeDefinitions = defineColumnTypes<ColumnTypesRow>({
  dateOnly: {
    type: "date",
    width: 132,
    filter: "date",
    formatter: ({ value }) => formatDate(value)
  },
  money: {
    type: "number",
    width: 140,
    filter: "number",
    editor: "number",
    formatter: ({ value }) => Number(value).toLocaleString("en-US")
  },
  percent: {
    type: "number",
    width: 136,
    filter: "number",
    formatter: ({ value }) => `${Number(value)}%`
  },
  statusPill: {
    type: "boolean",
    width: 124,
    filter: "boolean",
    renderer: {
      kind: "element",
      render: ({ value }, builder) =>
        renderPill(value === true ? "Active" : "Paused", "neutral", builder)
    }
  },
  riskPill: {
    width: 132,
    renderer: {
      kind: "element",
      render: ({ value }, builder) =>
        renderPill(String(value), String(value).toLowerCase(), builder)
    }
  }
});

export const columnTypesColumns: readonly ColumnDef<ColumnTypesRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 112 },
  { field: "department", headerName: "Text", type: "text", width: 160 },
  { field: "requestedAt", headerName: "Date", type: "dateOnly" },
  { field: "amount", headerName: "Number", type: "money" },
  { field: "progress", headerName: "Computed", type: "percent" },
  { field: "active", headerName: "Boolean", type: "statusPill" },
  { field: "risk", headerName: "Renderer", type: "riskPill" }
];

function formatDate(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })
    .format(new Date(value));
}

function defineColumnDefaults<TData>(
  defaults: DataColumnDefaults<TData>
): DataColumnDefaults<TData> {
  return Object.freeze(defaults);
}

function defineColumnTypes<TData>(
  registry: ColumnTypeRegistry<TData>
): ColumnTypeRegistry<TData> {
  return Object.freeze(registry);
}

function renderPill(label: string, tone: string, builder: RenderElementBuilder): RenderElement {
  return builder.element("span", { class: `example-pill example-pill--${tone}` }, [label]);
}
