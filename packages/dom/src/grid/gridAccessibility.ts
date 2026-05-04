import type { AccessibilityOptions, LocaleFormatterBridge } from "@onegrid/core";

export interface GridAccessibilityState {
  readonly rowCount: number;
  readonly columnCount: number;
  readonly loading: boolean;
  readonly error?: unknown;
}

let nextAccessibilityId = 0;

export function applyGridAccessibility(
  host: HTMLElement,
  grid: HTMLElement,
  options: AccessibilityOptions | undefined,
  state: GridAccessibilityState,
  i18n: LocaleFormatterBridge
): void {
  const label = options?.label?.trim() || i18n.text.gridLabel;
  grid.setAttribute("aria-label", label);
  grid.setAttribute("aria-readonly", "true");
  grid.setAttribute("aria-busy", String(state.loading));

  const describedByIds: string[] = [];
  if (options?.description) {
    const description = createScreenReaderText(options.description);
    host.append(description);
    describedByIds.push(description.id);
  }

  const liveRegion = createGridLiveRegion(options, state, i18n);
  if (liveRegion) {
    host.append(liveRegion);
    describedByIds.push(liveRegion.id);
  }

  if (describedByIds.length > 0) {
    grid.setAttribute("aria-describedby", describedByIds.join(" "));
  }
}

function createGridLiveRegion(
  options: AccessibilityOptions | undefined,
  state: GridAccessibilityState,
  i18n: LocaleFormatterBridge
): HTMLElement | undefined {
  const politeness = options?.liveRegion ?? "polite";
  if (politeness === "off") {
    return undefined;
  }

  const liveRegion = createScreenReaderText(formatLiveRegionText(state, i18n));
  liveRegion.classList.add("og-grid__live-region");
  liveRegion.setAttribute("role", state.error === undefined ? "status" : "alert");
  liveRegion.setAttribute("aria-live", state.error === undefined ? politeness : "assertive");
  liveRegion.setAttribute("aria-atomic", "true");
  return liveRegion;
}

function createScreenReaderText(text: string): HTMLElement {
  const element = document.createElement("div");
  element.id = `og-a11y-${++nextAccessibilityId}`;
  element.className = "og-grid__sr-only";
  element.textContent = text;
  return element;
}

function formatLiveRegionText(
  state: GridAccessibilityState,
  i18n: LocaleFormatterBridge
): string {
  if (state.error !== undefined) {
    return i18n.text.gridRowsCouldNotLoad;
  }

  if (state.loading) {
    return i18n.text.gridRowsLoading;
  }

  return i18n.text.gridReady({
    rowCount: state.rowCount,
    columnCount: state.columnCount,
    formatNumber: i18n.formatNumber
  });
}
