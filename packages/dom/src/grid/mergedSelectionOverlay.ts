export function applyMergedRowSelection(
  grid: HTMLElement,
  selectedRows: ReadonlySet<string>
): void {
  const rowKeyByIndex = collectRenderedRowKeys(grid);
  if (selectedRows.size === 0 || rowKeyByIndex.size === 0) {
    return;
  }

  for (const cell of grid.querySelectorAll<HTMLElement>(
    '[data-layout-section="body"] .og-grid__cell--merged[data-row-index][aria-rowspan]'
  )) {
    const firstRow = readNumber(cell.dataset.rowIndex);
    const rowSpan = readNumber(cell.getAttribute("aria-rowspan")) ?? 1;
    if (firstRow === undefined || rowSpan <= 1) {
      continue;
    }

    if (!isSpanRowSelected(firstRow, rowSpan, selectedRows, rowKeyByIndex)) {
      continue;
    }

    cell.classList.add("og-grid__cell--merged-row-selected");
    cell.dataset.mergedRowSelection = "true";
    cell.style.setProperty(
      "--og-merged-row-selection",
      "linear-gradient(var(--og-color-selected-bg), var(--og-color-selected-bg))"
    );
    cell.style.setProperty("background-image", "var(--og-merged-row-selection)");
    cell.setAttribute("aria-selected", "true");
  }
}

export function resetMergedRowSelection(cell: HTMLElement): void {
  if (cell.dataset.mergedRowSelection === "true") {
    cell.style.removeProperty("--og-merged-row-selection");
    cell.style.removeProperty("background-image");
  }
  cell.classList.remove("og-grid__cell--merged-row-selected");
  cell.removeAttribute("data-merged-row-selection");
}

function collectRenderedRowKeys(grid: HTMLElement): ReadonlyMap<number, string> {
  const result = new Map<number, string>();
  for (const row of grid.querySelectorAll<HTMLElement>('[data-layout-section="body"] [role="row"][data-row-key]')) {
    const rowIndex = readNumber(row.getAttribute("aria-rowindex"));
    const rowKey = row.dataset.rowKey;
    if (rowIndex !== undefined && rowKey !== undefined) {
      result.set(rowIndex - 1, rowKey);
    }
  }
  return result;
}

function isSpanRowSelected(
  firstRow: number,
  rowSpan: number,
  selectedRows: ReadonlySet<string>,
  rowKeyByIndex: ReadonlyMap<number, string>
): boolean {
  for (let offset = 0; offset < rowSpan; offset += 1) {
    const rowKey = rowKeyByIndex.get(firstRow + offset);
    if (rowKey !== undefined && selectedRows.has(rowKey)) {
      return true;
    }
  }
  return false;
}

function readNumber(value: string | undefined | null): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
