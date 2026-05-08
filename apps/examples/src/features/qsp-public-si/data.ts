import type { ColumnDef, GridOptions, RenderElement, RenderElementBuilder } from "@onegrid/core";
import { createSiTheme } from "@onegrid/themes";

export interface PublicSiRow {
  readonly id: string;
  readonly region: string;
  readonly agency: string;
  readonly service: string;
  readonly slaDays: number;
  readonly dataClass: "Public" | "Internal" | "Sensitive";
  readonly status: "Ready" | "Review" | "Blocked";
}

export const publicSiRows: readonly PublicSiRow[] = Object.freeze([
  {
    id: "PUB-0001",
    region: "Capital",
    agency: "Records Office",
    service: "Civil record request",
    slaDays: 2,
    dataClass: "Sensitive",
    status: "Review"
  },
  {
    id: "PUB-0002",
    region: "Capital",
    agency: "Records Office",
    service: "Address correction",
    slaDays: 1,
    dataClass: "Internal",
    status: "Ready"
  },
  {
    id: "PUB-0003",
    region: "Regional",
    agency: "Welfare Office",
    service: "Care subsidy",
    slaDays: 5,
    dataClass: "Sensitive",
    status: "Blocked"
  },
  {
    id: "PUB-0004",
    region: "Regional",
    agency: "Welfare Office",
    service: "Care center visit",
    slaDays: 3,
    dataClass: "Internal",
    status: "Review"
  },
  {
    id: "PUB-0005",
    region: "Digital",
    agency: "Platform Team",
    service: "Identity sync",
    slaDays: 1,
    dataClass: "Public",
    status: "Ready"
  }
]);

export const publicSiColumns: readonly ColumnDef<PublicSiRow>[] = Object.freeze([
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 126 },
  { field: "region", headerName: "Region", width: 140, merge: { mode: "value" } },
  { field: "agency", headerName: "Agency", width: 190, merge: { mode: "value" } },
  {
    groupId: "service",
    headerName: "Citizen service",
    children: [
      { field: "service", headerName: "Service", width: 230 },
      { field: "slaDays", headerName: "SLA days", type: "number", width: 112 },
      {
        field: "dataClass",
        headerName: "Data class",
        width: 138,
        renderer: {
          kind: "element",
          render: ({ value }, builder) => renderDataClass(value, builder)
        }
      }
    ]
  },
  {
    field: "status",
    headerName: "Status",
    pinned: "right",
    width: 126,
    renderer: {
      kind: "element",
      render: ({ value }, builder) => renderStatus(value, builder)
    }
  }
]);

export const publicSiOptions: GridOptions<PublicSiRow> = {
  columns: publicSiColumns,
  data: publicSiRows,
  rowKey: "id",
  rowModel: "client",
  merge: { enabled: true, strategy: "value", fields: ["region", "agency"] },
  columnUi: { menu: true, resize: true, reorder: true },
  filtering: { enabled: true, quickFilter: true },
  sorting: { enabled: true, multiSort: true },
  layout: { height: 388, bodyHeight: 388 },
  accessibility: { label: "Public sector SI quality grid" },
  security: { url: { allowedProtocols: ["https:", "mailto:", "tel:"] } },
  theme: createSiTheme({
    name: "qsp-public-civic",
    density: "compact",
    tokens: {
      colors: {
        accent: "#1d4ed8",
        accentHover: "#123a9c",
        header: "#eef5ff",
        pinnedHeader: "#e4eefc",
        selected: "#e7f0ff",
        hover: "#eef4ff",
        summary: "#f7faff"
      }
    }
  })
};

function renderDataClass(value: unknown, builder: RenderElementBuilder): RenderElement {
  const tone = value === "Sensitive" ? "high" : value === "Internal" ? "medium" : "low";
  return builder.element("span", { class: `example-pill example-pill--${tone}` }, [String(value)]);
}

function renderStatus(value: unknown, builder: RenderElementBuilder): RenderElement {
  const tone = value === "Blocked" ? "high" : value === "Review" ? "medium" : "low";
  return builder.element("span", { class: `example-pill example-pill--${tone}` }, [String(value)]);
}
