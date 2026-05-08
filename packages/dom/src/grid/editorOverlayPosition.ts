import { getVisibleCellRect } from "./editCellVisibility.js";

export function getOverlayHost(cell: HTMLElement): HTMLElement {
  return cell.closest<HTMLElement>(".og-grid-shell") ?? document.body;
}

export function getOverlayPositioning(cell: HTMLElement): "shell" | "viewport" {
  return cell.closest(".og-grid-shell") ? "shell" : "viewport";
}

export function positionOverlay(root: HTMLElement, cell: HTMLElement): void {
  const rect = getVisibleCellRect(cell) ?? cell.getBoundingClientRect();
  applyOverlayPosition(root, rect);
}

function applyOverlayPosition(
  root: HTMLElement,
  rect: { readonly top: number; readonly left: number; readonly width: number; readonly height: number }
): void {
  const origin = getOverlayOrigin(root);
  root.style.insetBlockStart = `${rect.top - origin.top}px`;
  root.style.insetInlineStart = `${rect.left - origin.left}px`;
  root.style.inlineSize = `${rect.width}px`;
  root.style.maxInlineSize = `${rect.width}px`;
  root.style.setProperty("--og-editor-cell-height", `${rect.height}px`);
  root.style.minBlockSize = `${rect.height}px`;
}

function getOverlayOrigin(root: HTMLElement): { readonly top: number; readonly left: number } {
  if (root.dataset.positioning !== "shell") {
    return { top: 0, left: 0 };
  }

  const rect = root.parentElement?.getBoundingClientRect();
  return rect ? { top: rect.top, left: rect.left } : { top: 0, left: 0 };
}
