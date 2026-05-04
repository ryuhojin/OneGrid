import type { ColumnDef, SecurityOptions } from "@onegrid/core";

export interface XssDefenseRow {
  readonly id: string;
  readonly plain: string;
  readonly textRenderer: string;
  readonly htmlRenderer: string;
  readonly link: string;
}

export const xssDefenseColumns: readonly ColumnDef<XssDefenseRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 110 },
  { field: "plain", headerName: "Default text", width: 300 },
  {
    field: "textRenderer",
    headerName: "Text renderer",
    width: 280,
    renderer: {
      kind: "text",
      render: ({ value }) => `<strong>${String(value)}</strong>`
    }
  },
  {
    field: "htmlRenderer",
    headerName: "Sanitized HTML",
    width: 210,
    renderer: {
      kind: "html",
      sanitize: true,
      render: ({ value }) =>
        `<strong onclick="window.__onegridXss = true">${String(value)}</strong>`
        + `<img src=x onerror="window.__onegridXss = true">`
        + "<script>window.__onegridXss = true</script>"
    }
  },
  {
    field: "link",
    headerName: "Element URL",
    width: 180,
    renderer: {
      kind: "element",
      render: ({ value }, builder) =>
        builder.element("a", {
          class: "xss-defense-link",
          href: String(value),
          onclick: "window.__onegridXss = true",
          style: "color:red",
          srcdoc: "<script>window.__onegridXss = true</script>"
        }, ["Open"])
    }
  }
];

export const xssDefenseRows: readonly XssDefenseRow[] = [
  {
    id: "XSS-001",
    plain: "<img src=x onerror=\"window.__onegridXss = true\">",
    textRenderer: "Escaped text renderer",
    htmlRenderer: "Approved",
    link: "javascript:window.__onegridXss = true"
  },
  {
    id: "XSS-002",
    plain: "<svg onload=\"window.__onegridXss = true\"></svg>",
    textRenderer: "No HTML interpretation",
    htmlRenderer: "Review",
    link: "https://example.com/security-review"
  }
];

export const xssDefenseSecurity: SecurityOptions = {
  html: {
    allowHtmlRenderer: true,
    trustedTypesPolicyName: "onegrid-xss-example",
    sanitizer: {
      sanitize: (html) =>
        html
          .replace(/<script[\s\S]*?<\/script>/giu, "")
          .replace(/<img\b[^>]*>/giu, "")
          .replace(/\s+on[a-z]+=(?:"[^"]*"|'[^']*'|[^\s>]*)/giu, "")
    }
  },
  url: {
    allowedProtocols: ["https:", "mailto:", "tel:"]
  }
};
