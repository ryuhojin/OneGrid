import type { LocaleFormatterBridge } from "@onegrid/core";

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

export function createFooterSection(
  rowRenderState: FooterState | undefined,
  i18n: LocaleFormatterBridge
): HTMLElement {
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
  status.textContent = i18n.text.footerRows(rowRenderState?.rowCount ?? 0, i18n.formatNumber);
  footer.append(status);

  if (!rowRenderState || (!rowRenderState.hasMore && !rowRenderState.loading)) {
    return section;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__load-more";
  button.disabled = rowRenderState.loading;
  button.textContent = rowRenderState.loading ? i18n.text.loadingRows : i18n.text.loadMoreRows;
  button.addEventListener("click", () => rowRenderState.onLoadMore());
  footer.append(button);
  return section;
}

export function createOverlayLayer(
  rowRenderState: OverlayState | undefined,
  i18n: LocaleFormatterBridge
): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "og-grid__overlay-layer";
  overlay.dataset.layoutSection = "overlay";
  overlay.setAttribute("role", "presentation");

  const status = createOverlayStatus(rowRenderState, i18n);
  if (status) {
    overlay.append(status);
  }

  return overlay;
}

function createOverlayStatus(
  rowRenderState: OverlayState | undefined,
  i18n: LocaleFormatterBridge
): HTMLElement | undefined {
  if (!rowRenderState) {
    return undefined;
  }

  if (rowRenderState.error !== undefined) {
    return createStatus("alert", i18n.text.unableToLoadRows);
  }

  if (rowRenderState.loading && rowRenderState.renderedRowCount === 0) {
    return createStatus("status", i18n.text.loadingRows);
  }

  if (!rowRenderState.loading && rowRenderState.rowCount === 0) {
    return createStatus("status", i18n.text.noRows);
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
