import type {
  GridSelectionMode,
  GridSelectionState,
  RowKey,
  SelectedCell,
  SelectionOptions
} from "@onegrid/core";
import { applyMergedRowSelection, resetMergedRowSelection } from "./mergedSelectionOverlay.js";
import {
  getCellRenderedRange,
  readCellSelectionTarget
} from "./selectionTarget.js";
export { readCellSelectionTarget } from "./selectionTarget.js";

export interface GridSelectionRuntime {
  readonly mode: GridSelectionMode;
  readonly checkbox: boolean;
  readonly selectAllMode: NonNullable<SelectionOptions["selectAll"]>;
  getState(): GridSelectionState;
  getAnchor(): SelectedCell | undefined;
  setAnchor(cell: SelectedCell): void;
  selectRows(rowKeys: readonly RowKey[]): void;
  toggleRow(rowKey: RowKey): void;
  selectCell(cell: SelectedCell, additive?: boolean): void;
  selectRange(anchor: SelectedCell, focus: SelectedCell, additive?: boolean): void;
  selectAllVisible(rowKeys: readonly RowKey[]): void;
  selectServerDataset(): void;
  clear(): void;
}

export interface GridSelectionAttachInput {
  readonly grid: HTMLElement;
  readonly runtime: GridSelectionRuntime;
}

const selectionHandles = new WeakMap<HTMLElement, AbortController>();

export function attachGridSelectionForHost(host: HTMLElement, input: GridSelectionAttachInput): void {
  disposeGridSelection(host);
  const abortController = new AbortController();
  selectionHandles.set(host, abortController);
  applyGridSelection(input.grid, input.runtime);

  host.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || isToolbarActionTarget(event) || isCheckboxTarget(event)) {
      return;
    }

    const suppressNativeSelection = isGridRangeGesture(input.runtime, event);
    if (suppressNativeSelection) {
      event.preventDefault();
    }

    handleCellSelection(input.grid, input.runtime, event);
    if (suppressNativeSelection) {
      clearNativeTextSelection(input.grid);
    }
  }, { signal: abortController.signal });

  host.addEventListener("click", (event) => {
    if (handleToolbarClick(input.grid, input.runtime, event)) {
      return;
    }

    if (handleCheckboxClick(input.grid, input.runtime, event)) {
      return;
    }

    if (!isBodyCellTarget(input.grid, event)) {
      handleCellSelection(input.grid, input.runtime, event);
    }
  }, { signal: abortController.signal });
}

export function disposeGridSelection(host: HTMLElement): void {
  selectionHandles.get(host)?.abort();
  selectionHandles.delete(host);
}

export function applyGridSelection(grid: HTMLElement, runtime: GridSelectionRuntime): void {
  const state = runtime.getState();
  const selectedRows = new Set(state.rowKeys.map((rowKey) => String(rowKey)));
  const checkboxRows = new Set<string>();

  for (const row of grid.querySelectorAll<HTMLElement>('[data-layout-section="body"] [role="row"]')) {
    row.classList.remove("og-grid__row--selected");
    row.removeAttribute("aria-selected");
  }

  for (const cell of getSelectableCells(grid)) {
    resetCellSelection(cell);
    const target = readCellSelectionTarget(cell);
    if (!target) {
      continue;
    }

    ensureRowCheckbox(cell, target.rowKey, runtime, checkboxRows);

    const rowSelected = selectedRows.has(String(target.rowKey));
    const cellSelected = isSelectedCell(state, target);
    const rangeSelected = isCellInSelectedRange(state, target, cell);
    if (rowSelected) {
      cell.classList.add("og-grid__cell--row-selected");
      markRowSelected(cell);
    }
    if (cellSelected) {
      cell.classList.add("og-grid__cell--selected");
    }
    if (rangeSelected) {
      cell.classList.add("og-grid__cell--selection-range");
    }
    if (rowSelected || cellSelected || rangeSelected) {
      cell.setAttribute("aria-selected", "true");
    }
  }

  applyMergedRowSelection(grid, selectedRows);
}

export function handleKeyboardSelection(
  grid: HTMLElement,
  runtime: GridSelectionRuntime,
  cell: HTMLElement,
  event: KeyboardEvent
): boolean {
  const target = readCellSelectionTarget(cell);
  if (!target) {
    return false;
  }

  if (event.key === " ") {
    toggleFromCell(runtime, target, event.ctrlKey || event.metaKey);
    applyGridSelection(grid, runtime);
    return true;
  }

  if (!isRangeNavigationKey(event.key) || !event.shiftKey) {
    return false;
  }

  runtime.setAnchor(runtime.getAnchor() ?? target);
  return false;
}

export function extendKeyboardSelectionToActiveCell(
  grid: HTMLElement,
  runtime: GridSelectionRuntime,
  additive: boolean
): void {
  const active = grid.querySelector<HTMLElement>(
    '[data-layout-section="body"] [role="gridcell"][data-focus-active="true"]'
  );
  const target = active ? readCellSelectionTarget(active) : undefined;
  const anchor = runtime.getAnchor();
  if (!target || !anchor) {
    return;
  }

  runtime.selectRange(anchor, target, additive);
  applyGridSelection(grid, runtime);
}

function handleToolbarClick(
  grid: HTMLElement,
  runtime: GridSelectionRuntime,
  event: MouseEvent
): boolean {
  const button = getElement(event.target)?.closest<HTMLButtonElement>("[data-selection-action]");
  if (!button) {
    return false;
  }

  event.preventDefault();
  const action = button.dataset.selectionAction;
  if (action === "clear") {
    runtime.clear();
  } else if (action === "visible") {
    runtime.selectAllVisible(getVisibleRowKeys(grid));
  } else if (action === "server") {
    runtime.selectServerDataset();
  }
  applyGridSelection(grid, runtime);
  return true;
}

function handleCheckboxClick(
  grid: HTMLElement,
  runtime: GridSelectionRuntime,
  event: MouseEvent
): boolean {
  const checkbox = getElement(event.target)?.closest<HTMLInputElement>(".og-grid__selection-checkbox");
  const rowKey = checkbox?.dataset.selectionRowKey;
  if (!checkbox || rowKey === undefined) {
    return false;
  }

  event.stopPropagation();
  runtime.toggleRow(rowKey);
  applyGridSelection(grid, runtime);
  return true;
}

function handleCellSelection(
  grid: HTMLElement,
  runtime: GridSelectionRuntime,
  event: MouseEvent
): void {
  if (runtime.mode === "none") {
    return;
  }

  const cell = getElement(event.target)?.closest<HTMLElement>('[role="gridcell"]');
  if (!cell || !grid.contains(cell) || cell.getAttribute("aria-hidden") === "true") {
    return;
  }

  const target = readCellSelectionTarget(cell);
  if (!target) {
    return;
  }

  const additive = event.ctrlKey || event.metaKey;
  if (runtime.mode === "row") {
    if (additive || runtime.checkbox) {
      runtime.toggleRow(target.rowKey);
    } else {
      runtime.selectRows([target.rowKey]);
    }
  } else if (runtime.mode === "cell") {
    runtime.selectCell(target, additive);
  } else if (runtime.mode === "range" && event.shiftKey && runtime.getAnchor()) {
    runtime.selectRange(runtime.getAnchor() as SelectedCell, target, additive);
  } else {
    runtime.selectCell(target, additive);
  }

  runtime.setAnchor(target);
  applyGridSelection(grid, runtime);
}

function toggleFromCell(runtime: GridSelectionRuntime, target: SelectedCell, additive: boolean): void {
  if (runtime.mode === "row") {
    runtime.toggleRow(target.rowKey);
    runtime.setAnchor(target);
    return;
  }

  if (runtime.mode === "range" && additive && runtime.getAnchor()) {
    runtime.selectRange(runtime.getAnchor() as SelectedCell, target, true);
    return;
  }

  runtime.selectCell(target, additive);
  runtime.setAnchor(target);
}

function ensureRowCheckbox(
  cell: HTMLElement,
  rowKey: RowKey,
  runtime: GridSelectionRuntime,
  seenRows: Set<string>
): void {
  const normalizedRowKey = String(rowKey);
  const existing = cell.querySelector<HTMLInputElement>(":scope > .og-grid__selection-checkbox");
  if (!runtime.checkbox || seenRows.has(normalizedRowKey)) {
    existing?.remove();
    return;
  }

  seenRows.add(normalizedRowKey);
  const state = runtime.getState();
  if (existing) {
    existing.checked = state.rowKeys.some((key) => String(key) === normalizedRowKey);
    return;
  }

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "og-grid__checkbox og-grid__selection-checkbox";
  checkbox.dataset.selectionRowKey = normalizedRowKey;
  checkbox.setAttribute("aria-label", `Select row ${normalizedRowKey}`);
  checkbox.checked = state.rowKeys.some((key) => String(key) === normalizedRowKey);
  cell.prepend(checkbox);
}

function resetCellSelection(cell: HTMLElement): void {
  cell.classList.remove(
    "og-grid__cell--row-selected",
    "og-grid__cell--selected",
    "og-grid__cell--selection-range",
    "og-grid__cell--merged-row-selected"
  );
  cell.removeAttribute("aria-selected");
  resetMergedRowSelection(cell);
}

function markRowSelected(cell: HTMLElement): void {
  const row = cell.closest<HTMLElement>('[role="row"]');
  row?.classList.add("og-grid__row--selected");
  row?.setAttribute("aria-selected", "true");
}

function getSelectableCells(grid: HTMLElement): HTMLElement[] {
  return Array.from(grid.querySelectorAll<HTMLElement>(
    '[data-layout-section="body"] [role="gridcell"]:not([aria-hidden="true"])'
  ));
}

function getVisibleRowKeys(grid: HTMLElement): readonly RowKey[] {
  const rowKeys: RowKey[] = [];
  const seen = new Set<string>();
  for (const cell of getSelectableCells(grid)) {
    const rowKey = cell.dataset.editRowKey;
    if (rowKey !== undefined && !seen.has(rowKey)) {
      seen.add(rowKey);
      rowKeys.push(rowKey);
    }
  }
  return Object.freeze(rowKeys);
}

function isSelectedCell(state: GridSelectionState, target: SelectedCell): boolean {
  return state.cells.some((cell) =>
    cell.rowIndex === target.rowIndex
    && cell.columnIndex === target.columnIndex
    && (cell.columnId ?? cell.field) === (target.columnId ?? target.field)
    && String(cell.rowKey) === String(target.rowKey)
  );
}

function isCellInSelectedRange(
  state: GridSelectionState,
  target: SelectedCell,
  cell: HTMLElement
): boolean {
  const cellRange = getCellRenderedRange(target, cell);
  return state.ranges.some((range) =>
    cellRange.firstRow <= range.lastRow
    && cellRange.lastRow >= range.firstRow
    && cellRange.firstColumn <= range.lastColumn
    && cellRange.lastColumn >= range.firstColumn
  );
}

function isRangeNavigationKey(key: string): boolean {
  return [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "PageUp",
    "PageDown"
  ].includes(key);
}

function getElement(target: EventTarget | null): Element | undefined {
  return target instanceof Element ? target : undefined;
}

function isToolbarActionTarget(event: MouseEvent): boolean {
  return getElement(event.target)?.closest("[data-selection-action]") !== null;
}

function isCheckboxTarget(event: MouseEvent): boolean {
  return getElement(event.target)?.closest(".og-grid__selection-checkbox") !== null;
}

function isBodyCellTarget(grid: HTMLElement, event: MouseEvent): boolean {
  const cell = getElement(event.target)?.closest<HTMLElement>('[role="gridcell"]');
  return cell !== undefined && cell !== null && grid.contains(cell) && cell.getAttribute("aria-hidden") !== "true";
}

function isGridRangeGesture(runtime: GridSelectionRuntime, event: MouseEvent): boolean {
  return runtime.mode === "range" && event.shiftKey && runtime.getAnchor() !== undefined;
}

function clearNativeTextSelection(grid: HTMLElement): void {
  grid.ownerDocument.defaultView?.getSelection()?.removeAllRanges();
}
