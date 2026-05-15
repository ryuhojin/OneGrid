import { createColumnMenuModel } from "@onegrid/core";
import type {
  ColumnMenuExtensionContext,
  ColumnMenuExtensionPayload,
  ColumnMenuAction,
  ColumnModel,
  ColumnUiState,
  GridPluginExtension,
  HeaderCell,
  NormalizedDataColumn
} from "@onegrid/core";
import type {
  ColumnUiRuntime,
  HeaderMenuExtensionRuntime,
  ResolvedColumnUiOptions
} from "./columnControls.js";
import { attachOverlayFocusTrap } from "./focusTrap.js";
import type { HeaderFilterRuntime } from "./filterRuntime.js";
import type { FocusTrapHandle } from "./focusTrap.js";
import { positionOverlay } from "./overlayPosition.js";
import { attachOverlayScrollSync } from "./overlayScrollSync.js";
import type { OverlayScrollSyncHandle } from "./overlayScrollSync.js";

let nextColumnMenuId = 0;

export function createColumnMenuButton<TData>(
  cell: HeaderCell,
  model: ColumnModel<TData>,
  state: ColumnUiState,
  options: ResolvedColumnUiOptions,
  runtime: ColumnUiRuntime,
  filterRuntime?: HeaderFilterRuntime
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__menu-button";
  button.setAttribute("aria-label", `Column menu ${cell.headerName}`);
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", createColumnMenuId(cell));

  const icon = document.createElement("span");
  icon.className = "og-grid__menu-icon";
  icon.setAttribute("aria-hidden", "true");
  button.append(icon);

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    showColumnMenu(button, cell, model, state, options, runtime, filterRuntime);
  });

  return button;
}

function showColumnMenu<TData>(
  anchor: HTMLButtonElement,
  cell: HeaderCell,
  model: ColumnModel<TData>,
  state: ColumnUiState,
  options: ResolvedColumnUiOptions,
  runtime: ColumnUiRuntime,
  filterRuntime?: HeaderFilterRuntime
): void {
  closeOpenColumnMenus();
  const menuModel = createColumnMenuModel(model, state, cell.sourceId);
  if (!menuModel) {
    return;
  }

  const menu = document.createElement("div");
  menu.className = "og-grid__column-menu";
  menu.id = anchor.getAttribute("aria-controls") ?? createColumnMenuId(cell);
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", `${cell.headerName} column menu`);
  menu.tabIndex = -1;
  let removeGlobalListeners = (): void => undefined;
  let focusTrap: FocusTrapHandle | undefined;
  let scrollSync: OverlayScrollSyncHandle | undefined;
  const closeCurrentMenu = (): void => {
    focusTrap?.destroy();
    focusTrap = undefined;
    scrollSync?.destroy();
    scrollSync = undefined;
    closeMenu(menu, anchor);
    removeGlobalListeners();
  };
  const column = model.byId.get(cell.sourceId);

  if (filterRuntime && column?.kind === "data") {
    menu.append(createFilterMenuItem(anchor, column, filterRuntime, closeCurrentMenu));
  }

  for (const item of menuModel.items) {
    if (!shouldRenderMenuAction(item.action, options)) {
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "og-grid__column-menu-item";
    button.textContent = item.label;
    button.disabled = !item.enabled;
    button.setAttribute("role", "menuitem");
    button.setAttribute("aria-disabled", String(!item.enabled));
    button.addEventListener("click", () => {
      runMenuAction(item.action, cell.sourceId, runtime);
      closeCurrentMenu();
    });
    menu.append(button);
  }

  appendExtensionMenuItems(
    menu,
    column?.kind === "data" ? column as NormalizedDataColumn : undefined,
    runtime.headerMenuExtensions,
    closeCurrentMenu
  );

  const onDocumentPointerDown = (event: PointerEvent): void => {
    if (!menu.contains(event.target as Node) && !anchor.contains(event.target as Node)) {
      closeCurrentMenu();
    }
  };
  document.body.append(menu);
  const reposition = (): void => {
    positionOverlay({ anchor, overlay: menu });
  };
  reposition();
  scrollSync = attachOverlayScrollSync({
    anchor,
    onUpdate: reposition,
    onAnchorMissing: closeCurrentMenu
  });
  anchor.setAttribute("aria-expanded", "true");
  menu.addEventListener("keydown", (event) => {
    handleMenuKeyDown(menu, event);
  });
  focusTrap = attachOverlayFocusTrap(menu, {
    restoreFocusTo: anchor,
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

function appendExtensionMenuItems(
  menu: HTMLElement,
  column: NormalizedDataColumn | undefined,
  extensions: HeaderMenuExtensionRuntime | undefined,
  closeCurrentMenu: () => void
): void {
  if (!column || !extensions) {
    return;
  }

  const context: ColumnMenuExtensionContext = {
    columnId: column.id,
    headerName: column.headerName,
    column: column.source
  };

  for (const extension of extensions.getExtensions()) {
    const payload = extension.payload;
    if (!payload || !isExtensionVisible(payload, context)) {
      continue;
    }

    menu.append(createExtensionMenuItem(extension, payload, context, closeCurrentMenu));
  }
}

function createExtensionMenuItem(
  extension: GridPluginExtension<ColumnMenuExtensionPayload>,
  payload: ColumnMenuExtensionPayload,
  context: ColumnMenuExtensionContext,
  closeCurrentMenu: () => void
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__column-menu-item";
  button.textContent = payload.label;
  button.disabled = resolveExtensionPredicate(payload.disabled, context);
  button.dataset.pluginId = extension.pluginId;
  button.dataset.pluginExtensionId = extension.id;
  button.setAttribute("role", "menuitem");
  button.setAttribute("aria-disabled", String(button.disabled));
  button.addEventListener("click", () => {
    payload.onSelect?.(context);
    closeCurrentMenu();
  });
  return button;
}

function isExtensionVisible(
  payload: ColumnMenuExtensionPayload,
  context: ColumnMenuExtensionContext
): boolean {
  return resolveExtensionPredicate(payload.visible, context, true);
}

function resolveExtensionPredicate(
  value: boolean | ((context: ColumnMenuExtensionContext) => boolean) | undefined,
  context: ColumnMenuExtensionContext,
  defaultValue = false
): boolean {
  return typeof value === "function" ? value(context) : value ?? defaultValue;
}

function createFilterMenuItem<TData>(
  anchor: HTMLButtonElement,
  column: NormalizedDataColumn<TData>,
  runtime: HeaderFilterRuntime,
  closeCurrentMenu: () => void
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__column-menu-item";
  button.textContent = `Filter ${column.headerName}`;
  button.setAttribute("role", "menuitem");
  button.addEventListener("click", () => {
    closeCurrentMenu();
    runtime.openColumnFilter(anchor, column as NormalizedDataColumn);
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

function shouldRenderMenuAction(
  action: ColumnMenuAction,
  options: ResolvedColumnUiOptions
): boolean {
  if (action === "autoSize") {
    return options.autoSize;
  }

  if (action === "moveLeft" || action === "moveRight") {
    return options.reorder;
  }

  return true;
}

function runMenuAction(
  action: ColumnMenuAction,
  columnId: string,
  runtime: ColumnUiRuntime
): void {
  if (action === "autoSize") {
    runtime.autoSizeColumn(columnId);
  } else if (action === "hide") {
    runtime.hideColumn(columnId);
  } else if (action === "pinLeft") {
    runtime.pinColumn(columnId, "left");
  } else if (action === "pinRight") {
    runtime.pinColumn(columnId, "right");
  } else if (action === "unpin") {
    runtime.pinColumn(columnId, null);
  } else if (action === "moveLeft") {
    runtime.moveColumnByOffset(columnId, -1);
  } else if (action === "moveRight") {
    runtime.moveColumnByOffset(columnId, 1);
  }
}

function closeOpenColumnMenus(): void {
  document
    .querySelectorAll<HTMLElement>(".og-grid__column-menu")
    .forEach((menu) => menu.remove());
  document
    .querySelectorAll<HTMLButtonElement>(".og-grid__menu-button[aria-expanded='true']")
    .forEach((button) => button.setAttribute("aria-expanded", "false"));
}

function closeMenu(menu: HTMLElement, anchor: HTMLButtonElement): void {
  menu.remove();
  anchor.setAttribute("aria-expanded", "false");
}

function createColumnMenuId(cell: HeaderCell): string {
  return `og-column-menu-${cell.id.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}-${++nextColumnMenuId}`;
}
