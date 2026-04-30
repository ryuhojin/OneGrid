import type {
  ContextMenuContext,
  ContextMenuModel,
  ContextMenuModelItem
} from "@onegrid/core";
import { attachOverlayFocusTrap } from "./focusTrap.js";
import type { FocusTrapHandle } from "./focusTrap.js";
import { positionOverlay } from "./overlayPosition.js";

export interface GridContextMenuRuntime<TData = unknown> {
  readonly enabled: boolean;
  createModel(cell: HTMLElement): ContextMenuModel<TData> | undefined;
  runItem(item: ContextMenuModelItem<TData>, context: ContextMenuContext<TData>): void;
}

export interface GridContextMenuInput<TData = unknown> {
  readonly grid: HTMLElement;
  readonly runtime: GridContextMenuRuntime<TData>;
}

export interface GridContextMenuHandle {
  destroy(): void;
}

const contextMenuHandles = new WeakMap<HTMLElement, GridContextMenuHandle>();
let closeCurrentContextMenu: (() => void) | undefined;

export function attachGridContextMenuForHost<TData>(
  host: HTMLElement,
  input: GridContextMenuInput<TData>
): void {
  disposeGridContextMenu(host);
  contextMenuHandles.set(host, attachGridContextMenu(input));
}

export function disposeGridContextMenu(host: HTMLElement): void {
  contextMenuHandles.get(host)?.destroy();
  contextMenuHandles.delete(host);
}

export function attachGridContextMenu<TData>(
  input: GridContextMenuInput<TData>
): GridContextMenuHandle {
  const abortController = new AbortController();

  input.grid.addEventListener("contextmenu", (event) => {
    if (!input.runtime.enabled || isNativeEditingTarget(event.target)) {
      return;
    }

    const cell = getContextCell(event.target, input.grid);
    const model = cell ? input.runtime.createModel(cell) : undefined;
    if (!cell || !model) {
      return;
    }

    event.preventDefault();
    showContextMenu({
      point: { x: event.clientX, y: event.clientY },
      model,
      runtime: input.runtime,
      restoreFocusTo: cell
    });
  }, { signal: abortController.signal });

  input.grid.addEventListener("keydown", (event) => {
    if (!input.runtime.enabled || isNativeEditingTarget(event.target) || !isContextMenuKey(event)) {
      return;
    }

    const cell = getContextCell(document.activeElement, input.grid)
      ?? getContextCell(event.target, input.grid);
    const model = cell ? input.runtime.createModel(cell) : undefined;
    if (!cell || !model) {
      return;
    }

    event.preventDefault();
    const rect = cell.getBoundingClientRect();
    showContextMenu({
      point: { x: rect.left + 12, y: rect.top + Math.min(rect.height - 4, 28) },
      model,
      runtime: input.runtime,
      restoreFocusTo: cell
    });
  }, { signal: abortController.signal });

  return {
    destroy() {
      abortController.abort();
      closeOpenContextMenus();
    }
  };
}

function showContextMenu<TData>(input: {
  readonly point: { readonly x: number; readonly y: number };
  readonly model: ContextMenuModel<TData>;
  readonly runtime: GridContextMenuRuntime<TData>;
  readonly restoreFocusTo?: HTMLElement;
}): void {
  closeOpenContextMenus();
  const menu = document.createElement("div");
  menu.className = "og-grid__context-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Context menu");
  menu.tabIndex = -1;
  let removeGlobalListeners = (): void => undefined;
  let focusTrap: FocusTrapHandle | undefined;
  const closeCurrentMenu = (): void => {
    focusTrap?.destroy();
    focusTrap = undefined;
    menu.remove();
    removeGlobalListeners();
    if (closeCurrentContextMenu === closeCurrentMenu) {
      closeCurrentContextMenu = undefined;
    }
  };

  for (const item of input.model.items) {
    menu.append(createMenuItem(item, input.model.context, input.runtime, closeCurrentMenu));
  }

  const onDocumentPointerDown = (event: PointerEvent): void => {
    if (!menu.contains(event.target as Node)) {
      closeCurrentMenu();
    }
  };
  document.body.append(menu);
  positionOverlay({ overlay: menu, point: input.point });
  menu.addEventListener("keydown", (event) => {
    handleMenuKeyDown(menu, event);
  });
  closeCurrentContextMenu = closeCurrentMenu;
  focusTrap = attachOverlayFocusTrap(menu, {
    ...(input.restoreFocusTo === undefined ? {} : { restoreFocusTo: input.restoreFocusTo }),
    onEscape: closeCurrentMenu
  });
  window.setTimeout(() => {
    document.addEventListener("pointerdown", onDocumentPointerDown);
    removeGlobalListeners = () => {
      document.removeEventListener("pointerdown", onDocumentPointerDown);
      removeGlobalListeners = (): void => undefined;
    };
  });
  menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
}

function createMenuItem<TData>(
  item: ContextMenuModelItem<TData>,
  context: ContextMenuContext<TData>,
  runtime: GridContextMenuRuntime<TData>,
  closeCurrentMenu: () => void
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__column-menu-item og-grid__context-menu-item";
  button.textContent = item.label;
  button.disabled = !item.enabled;
  button.setAttribute("role", "menuitem");
  button.setAttribute("aria-disabled", String(!item.enabled));
  button.addEventListener("click", () => {
    closeCurrentMenu();
    runtime.runItem(item, context);
  });
  return button;
}

function handleMenuKeyDown(menu: HTMLElement, event: KeyboardEvent): void {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    return;
  }

  const items = Array.from(menu.querySelectorAll<HTMLButtonElement>("[role='menuitem']"))
    .filter((item) => !item.disabled);
  if (items.length === 0) {
    return;
  }

  event.preventDefault();
  const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement));
  if (event.key === "Home") {
    items[0]?.focus();
  } else if (event.key === "End") {
    items.at(-1)?.focus();
  } else {
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  }
}

function getContextCell(target: EventTarget | null, grid: HTMLElement): HTMLElement | undefined {
  if (!(target instanceof Element)) {
    return undefined;
  }

  const cell = target.closest<HTMLElement>('[role="gridcell"]');
  return cell && grid.contains(cell) && cell.closest('[data-layout-section="body"]') !== null
    ? cell
    : undefined;
}

export function closeOpenContextMenus(): void {
  closeCurrentContextMenu?.();
  closeCurrentContextMenu = undefined;
  document
    .querySelectorAll<HTMLElement>(".og-grid__context-menu")
    .forEach((menu) => menu.remove());
}

function isNativeEditingTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest("input,textarea,select,[contenteditable='true'],[role='textbox'],.og-editor-overlay") !== null;
}

function isContextMenuKey(event: KeyboardEvent): boolean {
  return event.key === "ContextMenu" || (event.shiftKey && event.key === "F10");
}
