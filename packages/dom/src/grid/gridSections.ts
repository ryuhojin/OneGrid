import type { LayoutPane } from "@onegrid/core";

export function createSection<TData>(
  section: "header" | "body" | "summary",
  panes: Readonly<Record<"left" | "center" | "right", LayoutPane<TData>>>,
  renderPane: (pane: LayoutPane<TData>) => HTMLElement
): HTMLElement {
  const element = document.createElement("div");
  element.className = `og-grid__section og-grid__section--${section}`;
  element.dataset.layoutSection = section;
  element.setAttribute("role", section === "body" ? "rowgroup" : "presentation");
  element.style.gridTemplateColumns = section === "body"
    ? `${panes.left.width}px minmax(0, 1fr) ${panes.right.width}px`
    : `${panes.left.width}px minmax(0, 1fr) ${panes.right.width}px var(--og-scrollbar-inline-gutter)`;

  for (const key of ["left", "center", "right"] as const) {
    const pane = panes[key];
    const paneElement = document.createElement("div");
    paneElement.className = `og-grid__pane og-grid__pane--${key}`;
    paneElement.dataset.layoutPane = key;
    paneElement.dataset.layoutPaneVisible = String(pane.visible);
    paneElement.setAttribute("role", "presentation");
    if (!pane.visible) {
      paneElement.setAttribute("aria-hidden", "true");
    }
    paneElement.style.setProperty("--og-pane-width", `${pane.width}px`);
    paneElement.append(renderPane(pane));
    element.append(paneElement);
  }

  if (section !== "body") {
    const gutter = document.createElement("div");
    gutter.className = "og-grid__pane og-grid__pane--scrollbar-gutter";
    gutter.style.gridColumn = "4";
    gutter.style.gridRow = "1";
    gutter.setAttribute("role", "presentation");
    element.append(gutter);
  }

  return element;
}

export function createBodyViewport(): HTMLElement {
  const element = document.createElement("div");
  element.className = "og-grid__body-viewport";
  element.dataset.layoutViewport = "body";
  element.setAttribute("role", "presentation");
  return element;
}

export function createBodyShell(bodyViewport: HTMLElement): HTMLElement {
  const element = document.createElement("div");
  element.className = "og-grid__body-shell";
  element.setAttribute("role", "presentation");
  element.append(bodyViewport);
  return element;
}
