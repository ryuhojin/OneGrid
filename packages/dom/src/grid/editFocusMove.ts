import { focusTarget, getCellPosition, moveByTab } from "./gridFocusNavigation.js";

export function moveEditFocusAfterCommit(
  grid: HTMLElement,
  cell: HTMLElement,
  direction: -1 | 1
): void {
  const position = getCellPosition(cell);
  requestAnimationFrame(() => {
    if (moveByTab(grid, cell, direction) || !position) {
      return;
    }
    focusTarget(grid, {
      rowIndex: position.rowIndex,
      colIndex: direction > 0 ? position.colIndex + position.colSpan : position.colIndex - 1
    });
  });
}
