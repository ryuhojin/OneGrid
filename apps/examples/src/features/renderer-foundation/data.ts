import type { ColumnDef, SecurityOptions } from "@onegrid/core";

export interface RendererFoundationRow {
  readonly id: string;
  readonly customer: string;
  readonly risk: "Low" | "Medium" | "High";
  readonly status: "Ready" | "Review" | "Blocked";
  readonly note: string;
}

export const rendererFoundationColumns: readonly ColumnDef<RendererFoundationRow>[] = [
  {
    headerName: "Renderer Hosts",
    headerRenderer: {
      kind: "element",
      render: (_context, builder) =>
        builder?.element("span", { class: "renderer-foundation-header" }, ["Renderer Hosts"])
        ?? "Renderer Hosts"
    },
    children: [
      { field: "id", headerName: "ID", pinned: "left", width: 110 },
      {
        field: "customer",
        headerName: "Customer",
        width: 220,
        renderer: {
          kind: "text",
          render: ({ value }) => `Customer: ${String(value)}`
        }
      },
      {
        field: "risk",
        headerName: "Risk",
        width: 140,
        renderer: {
          kind: "element",
          render: ({ value }, builder) =>
            builder.element("span", { class: `risk-badge risk-badge--${String(value).toLowerCase()}` }, [
              String(value)
            ])
        }
      },
      {
        field: "status",
        headerName: "Status",
        width: 150,
        renderer: {
          kind: "html",
          sanitize: true,
          render: ({ value }) => `<strong onclick="alert(1)">${String(value)}</strong>`
        }
      },
      { field: "note", headerName: "Note", width: 260 }
    ]
  }
];

export const rendererFoundationRows: readonly RendererFoundationRow[] = [
  { id: "RF-001", customer: "Treasury Office", risk: "Low", status: "Ready", note: "Text renderer escapes source values" },
  { id: "RF-002", customer: "Audit Bureau", risk: "Medium", status: "Review", note: "Element renderer uses a DOM-safe builder" },
  { id: "RF-003", customer: "Procurement Hub", risk: "High", status: "Blocked", note: "HTML renderer requires sanitizer opt-in" }
];

export const rendererFoundationSecurity: SecurityOptions = {
  html: {
    allowHtmlRenderer: true,
    sanitizer: {
      sanitize: (html) => html.replace(/\s+on[a-z]+="[^"]*"/giu, "")
    }
  }
};
