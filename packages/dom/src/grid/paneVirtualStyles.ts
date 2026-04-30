import type { LayoutPane } from "@onegrid/core";

export function applyPaneVirtualInlineWindow<TData>(
  element: HTMLElement,
  pane: LayoutPane<TData>
): void {
  if (!pane.virtual) {
    return;
  }

  element.style.inlineSize = `${pane.virtual.renderedWidth}px`;
  element.style.transform = `translateX(${pane.virtual.offsetLeft}px)`;
  element.style.transformOrigin = "0 0";
  element.dataset.virtualFirstColumn = String(pane.virtual.firstColumn + 1);
  element.dataset.virtualLastColumn = String(pane.virtual.lastColumn + 1);
}
