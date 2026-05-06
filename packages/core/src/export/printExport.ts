import type { GridExportMatrix } from "./exportTypes.js";

export function exportPrintHtml(
  matrix: GridExportMatrix,
  options: { readonly title?: string } = {}
): string {
  const title = escapeHtml(options.title ?? "OneGrid Export");
  return [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"/>",
    `<title>${title}</title>`,
    "<style>",
    "html{background:#fff}",
    "body{font-family:Arial,sans-serif;margin:24px;color:#111827}",
    "h1{font-size:18px;margin:0 0 16px}",
    "table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:12px}",
    "thead{display:table-header-group}",
    "tfoot{display:table-footer-group}",
    "tr{break-inside:avoid;page-break-inside:avoid}",
    "th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left;vertical-align:middle;word-break:break-word}",
    "th{background:#eef2f7;font-weight:700}",
    "td[rowspan],td[colspan]{background:#fffbf0;font-weight:700}",
    "@page{size:landscape;margin:10mm}",
    "@media print{body{margin:0}table{font-size:10px}}",
    "</style></head><body>",
    `<h1>${title}</h1>`,
    "<table data-onegrid-print-layout=\"true\">",
    "<thead>",
    ...matrix.headerRows.map((row) => `<tr>${row.map((cell) => createHtmlCell("th", cell)).join("")}</tr>`),
    "</thead><tbody>",
    ...matrix.bodyRows.map((row) => `<tr>${row.map((cell) => createHtmlCell("td", cell)).join("")}</tr>`),
    "</tbody></table>",
    "</body></html>"
  ].join("");
}

function createHtmlCell(
  tagName: "td" | "th",
  cell: { readonly value: unknown; readonly covered?: boolean; readonly rowSpan?: number; readonly colSpan?: number }
): string {
  if (cell.covered === true) {
    return "";
  }
  const rowSpan = (cell.rowSpan ?? 1) > 1 ? ` rowspan="${cell.rowSpan}"` : "";
  const colSpan = (cell.colSpan ?? 1) > 1 ? ` colspan="${cell.colSpan}"` : "";
  return `<${tagName}${rowSpan}${colSpan}>${escapeHtml(formatValue(cell.value))}</${tagName}>`;
}

function formatValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
