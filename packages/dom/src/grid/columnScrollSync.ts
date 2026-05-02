export function syncColumnScroll(
  grid: HTMLElement,
  scrollElement: HTMLElement
): void {
  for (const sectionKey of ["header", "frozen", "summary"] as const) {
    syncSections(grid, sectionKey, scrollElement.scrollLeft);
  }
}

function syncSections(
  grid: HTMLElement,
  sectionKey: "header" | "frozen" | "summary",
  scrollLeft: number
): void {
  grid
    .querySelectorAll<HTMLElement>(`[data-layout-section="${sectionKey}"]`)
    .forEach((section) => syncSection(section, scrollLeft));
}

function syncSection(section: HTMLElement, scrollLeft: number): void {
  section.style.transform = scrollLeft > 0
    ? `translateX(${-scrollLeft}px)`
    : "";

  syncPaneTransform(section, "left", scrollLeft);
  syncPaneTransform(section, "right", scrollLeft);

  const gutterPane = section.querySelector<HTMLElement>(".og-grid__pane--scrollbar-gutter");
  if (gutterPane) {
    gutterPane.style.transform = scrollLeft > 0
      ? `translateX(${scrollLeft}px)`
      : "";
  }
}

function syncPaneTransform(
  section: HTMLElement,
  pane: "left" | "right",
  scrollLeft: number
): void {
  const paneElement = section.querySelector<HTMLElement>(`[data-layout-pane="${pane}"]`);
  if (paneElement) {
    paneElement.style.transform = scrollLeft > 0
      ? `translateX(${scrollLeft}px)`
      : "";
  }
}
