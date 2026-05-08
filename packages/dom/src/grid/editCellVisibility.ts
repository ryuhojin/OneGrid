export interface VisibleCellRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export function getBodyViewport(root: HTMLElement): HTMLElement | undefined {
  return root.querySelector<HTMLElement>(".og-grid__body-viewport") ?? undefined;
}

export function getCenterEditViewportWidth(root: HTMLElement, viewport: HTMLElement): number {
  const leftPane = getVisibleBodyPane(root, "left");
  const rightPane = getVisibleBodyPane(root, "right");
  const leftWidth = leftPane?.getBoundingClientRect().width ?? 0;
  const rightWidth = rightPane?.getBoundingClientRect().width ?? 0;
  return Math.max(0, viewport.clientWidth - leftWidth - rightWidth);
}

export function getVisibleCellRect(cell: HTMLElement): VisibleCellRect | undefined {
  const rect = cell.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return undefined;
  }

  const viewport = cell.closest<HTMLElement>(".og-grid__body-viewport");
  const pane = cell.closest<HTMLElement>(".og-grid__pane");
  if (!viewport || pane?.dataset.layoutPane !== "center") {
    return toVisibleRect(rect);
  }

  const clip = getCenterPaneClipRect(cell, viewport);
  const left = Math.max(rect.left, clip.left);
  const right = Math.min(rect.right, clip.left + clip.width);
  const top = Math.max(rect.top, clip.top);
  const bottom = Math.min(rect.bottom, clip.top + clip.height);
  if (right - left <= 0 || bottom - top <= 0) {
    return undefined;
  }

  return { top, left, width: right - left, height: bottom - top };
}

export function isMatchingEditCell(
  cell: HTMLElement,
  rowKey: string,
  field: string,
  columnId?: string
): boolean {
  return cell.isConnected
    && cell.dataset.editRowKey === rowKey
    && cell.dataset.field === field
    && (columnId === undefined || cell.dataset.columnId === columnId);
}

export function isCellVisibleInViewport(cell: HTMLElement, viewport: HTMLElement): boolean {
  const visible = getVisibleCellRect(cell);
  if (!visible) {
    return false;
  }

  const viewportRect = viewport.getBoundingClientRect();
  return visible.left < viewportRect.right
    && visible.left + visible.width > viewportRect.left
    && visible.top < viewportRect.bottom
    && visible.top + visible.height > viewportRect.top;
}

function getCenterPaneClipRect(cell: HTMLElement, viewport: HTMLElement): VisibleCellRect {
  const viewportRect = viewport.getBoundingClientRect();
  const grid = cell.closest<HTMLElement>(".og-grid");
  const leftPane = grid ? getVisibleBodyPane(grid, "left") : undefined;
  const rightPane = grid ? getVisibleBodyPane(grid, "right") : undefined;
  const left = leftPane
    ? Math.max(viewportRect.left, leftPane.getBoundingClientRect().right)
    : viewportRect.left;
  const right = rightPane
    ? Math.min(viewportRect.right, rightPane.getBoundingClientRect().left)
    : viewportRect.right;
  return {
    top: viewportRect.top,
    left,
    width: Math.max(0, right - left),
    height: viewportRect.height
  };
}

function getVisibleBodyPane(root: HTMLElement, pane: "left" | "right"): HTMLElement | undefined {
  return root.querySelector<HTMLElement>(
    `[data-layout-section="body"] [data-layout-pane="${pane}"][data-layout-pane-visible="true"]`
  ) ?? undefined;
}

function toVisibleRect(rect: DOMRect): VisibleCellRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
}
