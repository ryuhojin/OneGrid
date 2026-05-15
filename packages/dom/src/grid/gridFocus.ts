import { resolveEditKeyboardPolicy } from "@onegrid/core";
import type { ResolvedEditingKeyboardPolicy } from "@onegrid/core";
import type { GridEditRuntime } from "./editRuntime.js";
import {
  clearActiveCell,
  focusInitialCell,
  focusTarget,
  getCellFromEventTarget,
  getCellPosition,
  getCoordinateTarget,
  getInitialEditText,
  getNavigationTargetCell,
  isNavigationCellVisible,
  moveByTab,
  refreshRovingTabIndex,
  scrollNavigationCellIntoView,
  scrollTowardTarget,
  setActiveCell
} from "./gridFocusNavigation.js";
import type { NavigationTarget } from "./gridFocusNavigation.js";
import {
  extendKeyboardSelectionToActiveCell,
  handleKeyboardSelection
} from "./selectionRuntime.js";
import type { GridSelectionRuntime } from "./selectionRuntime.js";
import type { GridScrollCoordinator } from "./scrollCoordinator.js";

export interface GridFocusInput {
  readonly grid: HTMLElement;
  readonly viewport: HTMLElement;
  readonly scrollCoordinator?: GridScrollCoordinator;
  readonly editRuntime?: GridEditRuntime;
  readonly editKeyboardPolicy?: ResolvedEditingKeyboardPolicy;
  readonly selectionRuntime?: GridSelectionRuntime;
}

export interface GridFocusHandle {
  destroy(): void;
}

const focusHandles = new WeakMap<HTMLElement, GridFocusHandle>();

export function attachGridFocusForHost(host: HTMLElement, input: GridFocusInput): void {
  disposeGridFocus(host);
  focusHandles.set(host, attachGridFocus(input));
}

export function disposeGridFocus(host: HTMLElement): void {
  focusHandles.get(host)?.destroy();
  focusHandles.delete(host);
}

export function attachGridFocus(input: GridFocusInput): GridFocusHandle {
  const abortController = new AbortController();
  let frame = 0;
  let suppressGridFocus = false;
  let suppressReset = 0;
  const editKeyboardPolicy = input.editKeyboardPolicy ?? resolveEditKeyboardPolicy(undefined);

  input.grid.tabIndex = 0;
  input.grid.dataset.keyboardFocus = "true";
  refreshRovingTabIndex(input.grid);

  input.grid.addEventListener("focusin", (event) => {
    if (event.target === input.grid) {
      if (!suppressGridFocus) {
        focusInitialCell(input.grid);
      }
      return;
    }

    const cell = getCellFromEventTarget(event.target, input.grid);
    if (cell) {
      setActiveCell(input.grid, cell, false);
    }
  }, { signal: abortController.signal });

  input.grid.addEventListener("focusout", (event) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && input.grid.contains(nextTarget)) {
      return;
    }

    clearActiveCell(input.grid);
  }, { signal: abortController.signal });

  input.grid.addEventListener("pointerdown", (event) => {
    if (isNonBodyFocusTarget(event.target)) {
      suppressNextGridFocus();
      clearActiveCell(input.grid);
      return;
    }

    const cell = getCellFromEventTarget(event.target, input.grid);
    if (cell) {
      setActiveCell(input.grid, cell, true);
      if (shouldToggleCheckboxOnSingleClick(cell, event)) {
        event.stopPropagation();
      }
    }
  }, { capture: true, signal: abortController.signal });

  input.grid.addEventListener("click", (event) => {
    if (isNonBodyFocusTarget(event.target)) {
      return;
    }

    const cell = getCellFromEventTarget(event.target, input.grid);
    if (!cell || !shouldStartEditOnSingleClick(cell, event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.detail > 1) {
      return;
    }
    if (cell.dataset.editorKind === "checkbox") {
      input.editRuntime?.toggleCheckboxCell(cell, "pointer");
      return;
    }
    input.editRuntime?.startEditFromCell(cell, "pointer");
  }, { signal: abortController.signal });

  input.grid.addEventListener("dblclick", (event) => {
    if (isNonBodyFocusTarget(event.target)) {
      return;
    }

    const cell = getCellFromEventTarget(event.target, input.grid);
    if (!cell || getCellEditStartMode(cell) !== "doubleClick") {
      event.preventDefault();
      return;
    }
    if (input.editRuntime?.startEditFromCell(cell, "pointer") === true) {
      event.preventDefault();
    }
  }, { signal: abortController.signal });

  input.grid.addEventListener("keydown", (event) => {
    if (isNonBodyFocusTarget(event.target)) {
      return;
    }

    const cell = getCellFromEventTarget(event.target, input.grid);
    if (!cell) {
      return;
    }

    if (
      input.selectionRuntime
      && handleKeyboardSelection(input.grid, input.selectionRuntime, cell, event)
    ) {
      event.preventDefault();
      return;
    }

    if (event.key === "Backspace" && input.editRuntime && editKeyboardPolicy.clearOnBackspace) {
      event.preventDefault();
      input.editRuntime.startEditFromCell(cell, "keyboard", "");
      return;
    }

    const initialText = getInitialEditText(event, {
      startOnEnter: editKeyboardPolicy.startOnEnter
    });
    if (
      input.editRuntime
      && initialText !== undefined
      && input.editRuntime.startEditFromCell(cell, "keyboard", initialText) === true
    ) {
      event.preventDefault();
      return;
    }

    const moved = moveFromKey(input, cell, event, editKeyboardPolicy);
    if (moved) {
      event.preventDefault();
      if (event.shiftKey && input.selectionRuntime) {
        requestAnimationFrame(() => {
          if (input.selectionRuntime) {
            extendKeyboardSelectionToActiveCell(
              input.grid,
              input.selectionRuntime,
              event.ctrlKey || event.metaKey
            );
          }
        });
      }
    }
  }, { signal: abortController.signal });

  return {
    destroy() {
      abortController.abort();
      if (frame !== 0) cancelAnimationFrame(frame);
      if (suppressReset !== 0) window.clearTimeout(suppressReset);
      delete input.grid.dataset.keyboardFocus;
      input.grid.removeAttribute("aria-activedescendant");
      input.grid.removeAttribute("tabindex");
    }
  };

  function scheduleFocus(target: NavigationTarget): void {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      focusVisibleTarget(input, target);
    });
  }

  function moveFromKey(
    focusInput: GridFocusInput,
    cell: HTMLElement,
    event: KeyboardEvent,
    keyboardPolicy: ResolvedEditingKeyboardPolicy
  ): boolean {
    const position = getCellPosition(cell);
    if (!position) {
      return false;
    }

    if (event.key === "Tab") {
      if (!keyboardPolicy.moveOnTab) {
        return false;
      }
      const moved = moveByTab(focusInput.grid, cell, event.shiftKey ? -1 : 1);
      if (moved) {
        revealActiveCell(focusInput);
      }
      return moved;
    }

    const target = getCoordinateTarget(focusInput.grid, focusInput.viewport, position, event);
    if (!target) {
      return false;
    }

    if (focusVisibleTarget(focusInput, target)) {
      return true;
    }

    const targetCell = getNavigationTargetCell(focusInput.grid, target);
    scrollTowardTarget(focusInput, target, position, targetCell);
    scheduleFocus(target);
    return true;
  }

  function focusVisibleTarget(focusInput: GridFocusInput, target: NavigationTarget): boolean {
    const cell = getNavigationTargetCell(focusInput.grid, target);
    if (!cell || !isNavigationCellVisible(cell, focusInput.viewport)) {
      return false;
    }

    return focusTarget(focusInput.grid, target);
  }

  function revealActiveCell(focusInput: GridFocusInput): void {
    const active = focusInput.grid.querySelector<HTMLElement>('[data-focus-active="true"]');
    if (!active || isNavigationCellVisible(active, focusInput.viewport)) {
      return;
    }

    const position = getCellPosition(active);
    scrollNavigationCellIntoView(focusInput, active);
    if (position) {
      scheduleFocus({
        rowIndex: position.rowIndex,
        colIndex: position.colIndex
      });
    }
  }

  function suppressNextGridFocus(): void {
    suppressGridFocus = true;
    if (suppressReset !== 0) window.clearTimeout(suppressReset);
    suppressReset = window.setTimeout(() => {
      suppressGridFocus = false;
      suppressReset = 0;
    }, 0);
  }
}

function isNonBodyFocusTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest("button,input,select,textarea,a,[role='button'],[role='menuitem'],[role='columnheader'],.og-grid__header") !== null;
}

function shouldStartEditOnSingleClick(cell: HTMLElement, event: MouseEvent): boolean {
  return getCellEditStartMode(cell) === "singleClick" && isPlainPrimaryPointer(event);
}

function shouldToggleCheckboxOnSingleClick(cell: HTMLElement, event: MouseEvent): boolean {
  return cell.dataset.editorKind === "checkbox"
    && shouldStartEditOnSingleClick(cell, event);
}

function getCellEditStartMode(cell: HTMLElement): string {
  return cell.dataset.editStartMode ?? "doubleClick";
}

function isPlainPrimaryPointer(event: MouseEvent): boolean {
  return event.button === 0
    && !event.shiftKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey;
}
