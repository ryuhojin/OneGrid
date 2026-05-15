import type { GridScrollCoordinator } from "./scrollCoordinator.js";

export interface CellPosition {
  readonly rowIndex: number;
  readonly colIndex: number;
  readonly rowSpan: number;
  readonly colSpan: number;
}

export interface NavigationTarget {
  readonly rowIndex: number;
  readonly colIndex: number;
}

interface FocusViewportInput {
  readonly grid: HTMLElement;
  readonly viewport: HTMLElement;
  readonly scrollCoordinator?: GridScrollCoordinator;
}

const CELL_SELECTOR = [
  '[data-layout-section="frozen"] [role="gridcell"]:not([aria-hidden="true"])',
  '[data-layout-section="body"] [role="gridcell"]:not([aria-hidden="true"])'
].join(",");
const ACTIVE_CELL_SELECTOR = '[data-focus-active="true"]';

export function getCoordinateTarget(
  grid: HTMLElement,
  viewport: HTMLElement,
  position: CellPosition,
  event: KeyboardEvent
): NavigationTarget | undefined {
  const rowCount = readPositiveNumber(grid.getAttribute("aria-rowcount")) ?? position.rowIndex;
  const colCount = readPositiveNumber(grid.getAttribute("aria-colcount")) ?? position.colIndex;
  const pageStep = getPageStep(viewport);

  switch (event.key) {
    case "ArrowLeft":
      return { rowIndex: position.rowIndex, colIndex: position.colIndex - 1 };
    case "ArrowRight":
      return { rowIndex: position.rowIndex, colIndex: position.colIndex + position.colSpan };
    case "ArrowUp":
      return { rowIndex: position.rowIndex - 1, colIndex: position.colIndex };
    case "ArrowDown":
      return { rowIndex: position.rowIndex + position.rowSpan, colIndex: position.colIndex };
    case "Home":
      return {
        rowIndex: event.ctrlKey || event.metaKey ? 1 : position.rowIndex,
        colIndex: 1
      };
    case "End":
      return {
        rowIndex: event.ctrlKey || event.metaKey ? rowCount : position.rowIndex,
        colIndex: colCount
      };
    case "PageUp":
      return { rowIndex: position.rowIndex - pageStep, colIndex: position.colIndex };
    case "PageDown":
      return { rowIndex: position.rowIndex + pageStep, colIndex: position.colIndex };
    default:
      return undefined;
  }
}

export function focusInitialCell(grid: HTMLElement): void {
  const active = grid.querySelector<HTMLElement>(ACTIVE_CELL_SELECTOR)
    ?? getNavigableCells(grid).find((cell) => cell.tabIndex === 0);
  if (active) {
    setActiveCell(grid, active, true);
    return;
  }

  const firstCell = getNavigableCells(grid)[0];
  if (firstCell) {
    setActiveCell(grid, firstCell, true);
  }
}

export function focusTarget(grid: HTMLElement, target: NavigationTarget): boolean {
  const cell = getNavigationTargetCell(grid, target);
  if (!cell) {
    return false;
  }

  setActiveCell(grid, cell, true);
  return true;
}

export function getNavigationTargetCell(
  grid: HTMLElement,
  target: NavigationTarget
): HTMLElement | undefined {
  const clamped = clampTarget(grid, target);
  return findCellCovering(grid, clamped)
    ?? findNearestCell(grid, clamped);
}

export function isNavigationCellVisible(
  cell: HTMLElement,
  viewport: HTMLElement
): boolean {
  const rect = cell.getBoundingClientRect();
  const clip = getNavigationClipRect(cell, viewport);
  return rect.width > 0
    && rect.height > 0
    && rect.left < clip.right - 1
    && rect.right > clip.left + 1
    && rect.top < clip.bottom - 1
    && rect.bottom > clip.top + 1;
}

export function moveByTab(grid: HTMLElement, current: HTMLElement, direction: -1 | 1): boolean {
  const cells = getNavigableCells(grid).sort(byCellPosition);
  const currentIndex = cells.indexOf(current);
  if (currentIndex < 0) {
    return false;
  }
  const next = cells[currentIndex + direction];
  if (!next) {
    return false;
  }

  setActiveCell(grid, next, true);
  return true;
}

export function setActiveCell(grid: HTMLElement, cell: HTMLElement, focus: boolean): void {
  for (const active of grid.querySelectorAll<HTMLElement>(ACTIVE_CELL_SELECTOR)) {
    active.tabIndex = -1;
    delete active.dataset.focusActive;
  }

  cell.tabIndex = 0;
  cell.dataset.focusActive = "true";
  grid.setAttribute("aria-activedescendant", ensureCellId(cell));
  if (focus && document.activeElement !== cell) {
    cell.focus({ preventScroll: true });
  }
}

export function clearActiveCell(grid: HTMLElement): void {
  for (const active of grid.querySelectorAll<HTMLElement>(ACTIVE_CELL_SELECTOR)) {
    delete active.dataset.focusActive;
  }
  grid.removeAttribute("aria-activedescendant");
}

export function refreshRovingTabIndex(grid: HTMLElement): void {
  const cells = getNavigableCells(grid);
  const active = cells.find((cell) => cell.dataset.focusActive === "true") ?? cells[0];
  for (const cell of cells) {
    cell.tabIndex = cell === active ? 0 : -1;
  }
  if (active) {
    ensureCellId(active);
  }
}

export function getCellFromEventTarget(
  target: EventTarget | null,
  grid: HTMLElement
): HTMLElement | undefined {
  if (!(target instanceof Element)) {
    return undefined;
  }

  const cell = target.closest<HTMLElement>('[role="gridcell"]');
  return cell && grid.contains(cell) && cell.getAttribute("aria-hidden") !== "true"
    ? cell
    : undefined;
}

export function getCellPosition(cell: HTMLElement): CellPosition | undefined {
  const row = cell.closest<HTMLElement>('[role="row"]');
  const rowIndex = readPositiveNumber(row?.getAttribute("aria-rowindex") ?? undefined);
  const colIndex = readPositiveNumber(cell.getAttribute("aria-colindex"));
  if (rowIndex === undefined || colIndex === undefined) {
    return undefined;
  }

  return {
    rowIndex,
    colIndex,
    rowSpan: readPositiveNumber(cell.getAttribute("aria-rowspan")) ?? 1,
    colSpan: readPositiveNumber(cell.getAttribute("aria-colspan")) ?? 1
  };
}

export function scrollTowardTarget(
  input: FocusViewportInput,
  target: NavigationTarget,
  current: CellPosition,
  targetCell?: HTMLElement
): void {
  if (targetCell) {
    scrollNavigationCellIntoView(input, targetCell);
    return;
  }

  const rowDelta = target.rowIndex - current.rowIndex;
  if (rowDelta !== 0) {
    setViewportScroll(input, "vertical", Math.max(
      0,
      (target.rowIndex - 1) * getEstimatedRowHeight(input.grid)
    ));
  }

  const colDelta = target.colIndex - current.colIndex;
  if (colDelta !== 0) {
    setViewportScroll(input, "horizontal", Math.max(
      0,
      getViewportScroll(input, "horizontal")
        + Math.sign(colDelta) * getEstimatedColumnWidth(input.grid)
    ));
  }
}

export function scrollNavigationCellIntoView(
  input: FocusViewportInput,
  cell: HTMLElement
): void {
  const rect = cell.getBoundingClientRect();
  const clip = getNavigationClipRect(cell, input.viewport);
  let nextScrollTop = getViewportScroll(input, "vertical");
  let nextScrollLeft = getViewportScroll(input, "horizontal");

  if (rect.top < clip.top) {
    nextScrollTop -= clip.top - rect.top;
  } else if (rect.bottom > clip.bottom) {
    nextScrollTop += rect.bottom - clip.bottom;
  }

  if (cell.closest<HTMLElement>(".og-grid__pane")?.dataset.layoutPane === "center") {
    if (rect.left < clip.left) {
      nextScrollLeft -= clip.left - rect.left;
    } else if (rect.right > clip.right) {
      nextScrollLeft += rect.right - clip.right;
    }
  }

  nextScrollTop = Math.max(0, nextScrollTop);
  nextScrollLeft = Math.max(0, nextScrollLeft);
  const currentTop = getViewportScroll(input, "vertical");
  const currentLeft = getViewportScroll(input, "horizontal");
  if (
    Math.abs(nextScrollTop - currentTop) < 1
    && Math.abs(nextScrollLeft - currentLeft) < 1
  ) {
    return;
  }

  setViewportScroll(input, "vertical", nextScrollTop);
  setViewportScroll(input, "horizontal", nextScrollLeft);
}

export function getInitialEditText(
  event: KeyboardEvent,
  options: { readonly startOnEnter: boolean }
): string | undefined {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
    return undefined;
  }

  if ((event.key === "Enter" && options.startOnEnter) || event.key === "F2") {
    return "";
  }

  return event.key.length === 1 ? event.key : undefined;
}

function getNavigableCells(grid: HTMLElement): HTMLElement[] {
  return Array.from(grid.querySelectorAll<HTMLElement>(CELL_SELECTOR))
    .filter((cell) => getCellPosition(cell) !== undefined);
}

function findCellCovering(grid: HTMLElement, target: NavigationTarget): HTMLElement | undefined {
  const cells = getNavigableCells(grid);
  return cells.find((cell) => {
    const position = getCellPosition(cell);
    return position
      ? position.rowIndex === target.rowIndex && isColumnCovered(position, target.colIndex)
      : false;
  }) ?? cells.find((cell) => {
    const position = getCellPosition(cell);
    return position
      ? isRowCovered(position, target.rowIndex) && isColumnCovered(position, target.colIndex)
      : false;
  });
}

function findNearestCell(grid: HTMLElement, target: NavigationTarget): HTMLElement | undefined {
  return getNavigableCells(grid)
    .map((cell) => ({ cell, position: getCellPosition(cell) }))
    .filter((item): item is { readonly cell: HTMLElement; readonly position: CellPosition } =>
      item.position !== undefined
    )
    .sort((left, right) =>
      getDistance(left.position, target) - getDistance(right.position, target)
    )[0]?.cell;
}

function getEstimatedRowHeight(grid: HTMLElement): number {
  return getNavigableCells(grid)[0]?.getBoundingClientRect().height || 36;
}

function getEstimatedColumnWidth(grid: HTMLElement): number {
  const cells = getNavigableCells(grid);
  const widths = cells.map((cell) => cell.getBoundingClientRect().width).filter((width) => width > 0);
  return widths.length === 0
    ? 120
    : widths.reduce((total, width) => total + width, 0) / widths.length;
}

function getPageStep(viewport: HTMLElement): number {
  const firstRow = viewport.querySelector<HTMLElement>('[role="row"]');
  const rowHeight = firstRow?.getBoundingClientRect().height || 36;
  return Math.max(1, Math.floor(viewport.clientHeight / rowHeight) - 1);
}

function getNavigationClipRect(
  cell: HTMLElement,
  viewport: HTMLElement
): { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number } {
  const viewportRect = viewport.getBoundingClientRect();
  if (cell.closest<HTMLElement>(".og-grid__pane")?.dataset.layoutPane !== "center") {
    return viewportRect;
  }

  const grid = viewport.closest<HTMLElement>(".og-grid");
  const leftPane = grid?.querySelector<HTMLElement>(
    '[data-layout-section="body"] [data-layout-pane="left"][data-layout-pane-visible="true"]'
  );
  const rightPane = grid?.querySelector<HTMLElement>(
    '[data-layout-section="body"] [data-layout-pane="right"][data-layout-pane-visible="true"]'
  );
  const left = leftPane
    ? Math.max(viewportRect.left, leftPane.getBoundingClientRect().right)
    : viewportRect.left;
  const right = rightPane
    ? Math.min(viewportRect.right, rightPane.getBoundingClientRect().left)
    : viewportRect.right;
  return {
    top: viewportRect.top,
    right,
    bottom: viewportRect.bottom,
    left
  };
}

function clampTarget(grid: HTMLElement, target: NavigationTarget): NavigationTarget {
  const rowCount = readPositiveNumber(grid.getAttribute("aria-rowcount")) ?? target.rowIndex;
  const colCount = readPositiveNumber(grid.getAttribute("aria-colcount")) ?? target.colIndex;
  return {
    rowIndex: Math.max(1, Math.min(rowCount, target.rowIndex)),
    colIndex: Math.max(1, Math.min(colCount, target.colIndex))
  };
}

function byCellPosition(left: HTMLElement, right: HTMLElement): number {
  const leftPosition = getCellPosition(left);
  const rightPosition = getCellPosition(right);
  return (leftPosition?.rowIndex ?? 0) - (rightPosition?.rowIndex ?? 0)
    || (leftPosition?.colIndex ?? 0) - (rightPosition?.colIndex ?? 0);
}

function getDistance(position: CellPosition, target: NavigationTarget): number {
  return Math.abs(position.rowIndex - target.rowIndex) * 1_000
    + Math.abs(position.colIndex - target.colIndex);
}

function isRowCovered(position: CellPosition, rowIndex: number): boolean {
  return rowIndex >= position.rowIndex && rowIndex < position.rowIndex + position.rowSpan;
}

function isColumnCovered(position: CellPosition, colIndex: number): boolean {
  return colIndex >= position.colIndex && colIndex < position.colIndex + position.colSpan;
}

function getViewportScroll(
  input: FocusViewportInput,
  axis: "vertical" | "horizontal"
): number {
  const state = input.scrollCoordinator?.read();
  if (axis === "vertical") {
    return state?.scrollTop ?? input.viewport.scrollTop;
  }

  return state?.scrollLeft ?? input.viewport.scrollLeft;
}

function setViewportScroll(
  input: FocusViewportInput,
  axis: "vertical" | "horizontal",
  value: number
): void {
  const current = getViewportScroll(input, axis);
  if (Math.abs(current - value) < 1) {
    return;
  }

  if (input.scrollCoordinator) {
    input.scrollCoordinator.setScroll(axis, value);
    return;
  }

  if (axis === "vertical") {
    input.viewport.scrollTop = value;
  } else {
    input.viewport.scrollLeft = value;
  }
  input.viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
}

function readPositiveNumber(value: string | undefined | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function ensureCellId(cell: HTMLElement): string {
  if (!cell.id) {
    const position = getCellPosition(cell);
    const columnId = cell.dataset.columnId ?? "cell";
    cell.id = position
      ? `og-cell-${position.rowIndex}-${position.colIndex}-${columnId}`
      : `og-cell-${columnId}`;
  }
  return cell.id;
}
