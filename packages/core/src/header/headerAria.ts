import type { HeaderCell, HeaderTreeNode } from "./headerTypes.js";

export function createHeaderAriaLabel(
  headerName: string,
  columnCount: number,
  kind: HeaderCell["kind"]
): string {
  if (kind === "column") {
    return headerName;
  }

  const suffix = columnCount === 1 ? "1 column" : `${columnCount} columns`;
  return `${headerName}, spans ${suffix}`;
}

export function collectHeaderAriaLabels(
  rows: readonly { readonly cells: readonly HeaderCell[] }[]
): ReadonlyMap<string, string> {
  const labels = new Map<string, string>();

  for (const row of rows) {
    for (const cell of row.cells) {
      labels.set(cell.id, cell.ariaLabel);
    }
  }

  return labels;
}

export function createTreeNodeAriaLabel<TData>(node: HeaderTreeNode<TData>): string {
  return createHeaderAriaLabel(node.headerName, node.columnIds.length, node.kind);
}
