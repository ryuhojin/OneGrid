import type { GridEditRuntime } from "./editRuntime.js";
import {
  clearActiveCell,
  focusInitialCell,
  focusTarget,
  getCellFromEventTarget,
  getCellPosition,
  getCoordinateTarget,
  getInitialEditText,
  moveByTab,
  refreshRovingTabIndex,
  scrollTowardTarget,
  setActiveCell
} from "./gridFocusNavigation.js";
import type { NavigationTarget } from "./gridFocusNavigation.js";
import {
  extendKeyboardSelectionToActiveCell,
  handleKeyboardSelection
} from "./selectionRuntime.js";
import type { GridSelectionRuntime } from "./selectionRuntime.js";

export interface GridFocusInput {
  readonly grid: HTMLElement;
  readonly viewport: HTMLElement;
  readonly editRuntime?: GridEditRuntime;
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
    }
  }, { capture: true, signal: abortController.signal });

  input.grid.addEventListener("dblclick", (event) => {
    if (isNonBodyFocusTarget(event.target)) {
      return;
    }

    const cell = getCellFromEventTarget(event.target, input.grid);
    if (cell && input.editRuntime?.startEditFromCell(cell, "pointer") === true) {
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

    const initialText = getInitialEditText(event);
    if (
      input.editRuntime
      && initialText !== undefined
      && input.editRuntime.startEditFromCell(cell, "keyboard", initialText) === true
    ) {
      event.preventDefault();
      return;
    }

    const moved = moveFromKey(input, cell, event);
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
      focusTarget(input.grid, target);
    });
  }

  function moveFromKey(focusInput: GridFocusInput, cell: HTMLElement, event: KeyboardEvent): boolean {
    const position = getCellPosition(cell);
    if (!position) {
      return false;
    }

    if (event.key === "Tab") {
      return moveByTab(focusInput.grid, cell, event.shiftKey ? -1 : 1);
    }

    const target = getCoordinateTarget(focusInput.grid, focusInput.viewport, position, event);
    if (!target) {
      return false;
    }

    const moved = focusTarget(focusInput.grid, target);
    if (!moved) {
      scrollTowardTarget(focusInput, target, position);
      scheduleFocus(target);
    }
    return true;
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
