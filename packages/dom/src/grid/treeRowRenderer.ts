import type { NormalizedDataColumn, RowKey, TreeRowEntry } from "@onegrid/core";

export interface TreeRowRuntime {
  readonly treeColumnField?: string;
  onToggleTree(key: RowKey): void;
  onSelectTree(key: RowKey, selected: boolean): void;
}

export interface TreeBodyRowOptions {
  readonly ariaColumnOffset: number;
  readonly renderTreeControls: boolean;
  readonly treeColumnField?: string;
  readonly exposeRowKey: boolean;
  readonly runtime: TreeRowRuntime | undefined;
}

export function createTreeBodyRow<TData>(
  entry: TreeRowEntry<TData>,
  columns: readonly NormalizedDataColumn<TData>[],
  columnTemplate: string,
  options: TreeBodyRowOptions
): HTMLElement {
  const row = document.createElement("div");
  row.className = "og-grid__row og-grid__tree-row";
  row.style.gridTemplateColumns = columnTemplate;
  row.setAttribute("role", "row");
  row.setAttribute("aria-rowindex", String(entry.rowIndex + 1));
  row.setAttribute("aria-level", String(entry.ariaLevel));
  if (entry.hasChildren) {
    row.setAttribute("aria-expanded", String(entry.expanded));
  }
  if (options.exposeRowKey) {
    row.dataset.rowKey = String(entry.key);
  }

  columns.forEach((column, columnIndex) => {
    const cell = document.createElement("div");
    cell.className = getCellClassName("og-grid__cell", column);
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-colindex", String(options.ariaColumnOffset + columnIndex + 1));
    cell.dataset.columnId = column.id;

    if (options.renderTreeControls && isTreeColumn(column, columnIndex, options.treeColumnField)) {
      cell.classList.add("og-grid__tree-cell");
      appendTreeControls(cell, entry, options.runtime);
    }
    cell.append(document.createTextNode(formatCellValue(readField(entry.data, column.field))));
    row.append(cell);
  });

  return row;
}

function appendTreeControls<TData>(
  cell: HTMLElement,
  entry: TreeRowEntry<TData>,
  runtime: TreeRowRuntime | undefined
): void {
  const spacer = document.createElement("span");
  spacer.className = "og-grid__tree-indent";
  spacer.style.inlineSize = `${entry.indent}px`;
  spacer.setAttribute("aria-hidden", "true");
  cell.append(spacer);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "og-grid__tree-toggle";
  toggle.disabled = !entry.hasChildren || !runtime;
  toggle.textContent = entry.loading ? "..." : entry.expanded ? "-" : "+";
  toggle.setAttribute("aria-label", `${entry.expanded ? "Collapse" : "Expand"} ${String(entry.key)}`);
  if (entry.hasChildren) {
    toggle.setAttribute("aria-expanded", String(entry.expanded));
  }
  if (entry.loading) {
    toggle.setAttribute("aria-busy", "true");
  }
  toggle.addEventListener("click", () => runtime?.onToggleTree(entry.key));
  cell.append(toggle);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "og-grid__checkbox og-grid__tree-checkbox";
  checkbox.checked = entry.selected;
  checkbox.indeterminate = entry.selectionState === "mixed";
  checkbox.setAttribute("aria-label", `Select ${String(entry.key)}`);
  checkbox.setAttribute(
    "aria-checked",
    entry.selectionState === "mixed" ? "mixed" : String(entry.selected)
  );
  checkbox.dataset.treeSelectionState = entry.selectionState;
  checkbox.addEventListener("change", () => runtime?.onSelectTree(entry.key, checkbox.checked));
  cell.append(checkbox);
}

function isTreeColumn<TData>(
  column: NormalizedDataColumn<TData>,
  columnIndex: number,
  treeColumnField: string | undefined
): boolean {
  return treeColumnField
    ? column.field === treeColumnField || column.id === treeColumnField
    : columnIndex === 0;
}

function getCellClassName<TData>(baseClassName: string, column: NormalizedDataColumn<TData>): string {
  return column.pinned ? `${baseClassName} ${baseClassName}--pinned-${column.pinned}` : baseClassName;
}

function readField(row: unknown, field: string): unknown {
  if (row === null || typeof row !== "object") {
    return undefined;
  }

  return (row as Readonly<Record<string, unknown>>)[field];
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}
