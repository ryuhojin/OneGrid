export interface FooterState {
  readonly rowCount: number;
  readonly loading: boolean;
  readonly hasMore: boolean;
  onLoadMore(): void;
}

export interface OverlayState {
  readonly rowCount: number;
  readonly renderedRowCount: number;
  readonly loading: boolean;
  readonly error?: unknown;
}

export function createFooterSection(rowRenderState: FooterState | undefined): HTMLElement {
  const section = document.createElement("div");
  section.className = "og-grid__section og-grid__section--footer";
  section.dataset.layoutSection = "footer";
  section.setAttribute("role", "presentation");

  const footer = document.createElement("div");
  footer.className = "og-grid__footer-pane";
  footer.setAttribute("role", "presentation");
  section.append(footer);

  const status = document.createElement("span");
  status.className = "og-grid__footer-status";
  status.textContent = `Rows: ${formatRowCount(rowRenderState?.rowCount ?? 0)}`;
  footer.append(status);

  if (!rowRenderState || (!rowRenderState.hasMore && !rowRenderState.loading)) {
    return section;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__load-more";
  button.disabled = rowRenderState.loading;
  button.textContent = rowRenderState.loading ? "Loading rows" : "Load more rows";
  button.addEventListener("click", () => rowRenderState.onLoadMore());
  footer.append(button);
  return section;
}

function formatRowCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function createOverlayLayer(
  rowRenderState: OverlayState | undefined
): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "og-grid__overlay-layer";
  overlay.dataset.layoutSection = "overlay";
  overlay.setAttribute("role", "presentation");

  const status = createOverlayStatus(rowRenderState);
  if (status) {
    overlay.append(status);
  }

  return overlay;
}

function createOverlayStatus(rowRenderState: OverlayState | undefined): HTMLElement | undefined {
  if (!rowRenderState) {
    return undefined;
  }

  if (rowRenderState.error !== undefined) {
    return createStatus("alert", "Unable to load rows");
  }

  if (rowRenderState.loading && rowRenderState.renderedRowCount === 0) {
    return createStatus("status", "Loading rows");
  }

  if (!rowRenderState.loading && rowRenderState.rowCount === 0) {
    return createStatus("status", "No rows");
  }

  return undefined;
}

function createStatus(role: "status" | "alert", text: string): HTMLElement {
  const status = document.createElement("div");
  status.className = "og-grid__overlay-status";
  status.setAttribute("role", role);
  status.textContent = text;
  return status;
}
