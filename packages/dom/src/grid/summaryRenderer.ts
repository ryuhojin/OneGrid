import type {
  LayoutPane,
  NormalizedDataColumn,
  SummaryRow
} from "@onegrid/core";
import { applyPaneVirtualInlineWindow } from "./paneVirtualStyles.js";

export function createSummaryPane<TData>(
  pane: LayoutPane<TData>,
  summary: SummaryRow | undefined,
  ariaRowIndex = 1
): HTMLElement {
  const row = document.createElement("div");
  row.className = "og-grid__row og-grid__summary-row";
  row.style.gridTemplateColumns = pane.columnTemplate;
  row.setAttribute("role", "row");
  row.setAttribute("aria-rowindex", String(ariaRowIndex));
  applyPaneVirtualInlineWindow(row, pane);

  pane.columns.forEach((column, columnIndex) => {
    const cell = createSummaryCell(column, pane.ariaColumnOffset + columnIndex + 1, summary);
    row.append(cell);
  });

  return row;
}

function createSummaryCell<TData>(
  column: NormalizedDataColumn<TData>,
  ariaColumnIndex: number,
  summary: SummaryRow | undefined
): HTMLElement {
  const cell = document.createElement("div");
  cell.className = getCellClassName("og-grid__cell og-grid__summary-cell", column);
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-colindex", String(ariaColumnIndex));
  cell.dataset.columnId = column.id;

  const summaryCell = summary?.cells.find((item) => item.columnId === column.id);
  if (summaryCell) {
    const value = formatSummaryValue(summaryCell.value);
    cell.dataset.summaryField = summaryCell.field;
    cell.dataset.summaryLabel = summaryCell.label;
    cell.dataset.summaryValue = value;
    cell.setAttribute("aria-label", `${summaryCell.label} ${value}`.trim());
    cell.append(createSummaryLabel(summaryCell.label), createSummaryValue(value));
  }
  return cell;
}

function getCellClassName<TData>(baseClassName: string, column: NormalizedDataColumn<TData>): string {
  return column.pinned ? `${baseClassName} ${baseClassName}--pinned-${column.pinned}` : baseClassName;
}

function formatSummaryValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  return String(value);
}

function createSummaryLabel(label: string): HTMLElement {
  const element = document.createElement("span");
  element.className = "og-grid__summary-label";
  element.textContent = label;
  return element;
}

function createSummaryValue(value: string): HTMLElement {
  const element = document.createElement("span");
  element.className = "og-grid__summary-value";
  element.textContent = value;
  return element;
}
