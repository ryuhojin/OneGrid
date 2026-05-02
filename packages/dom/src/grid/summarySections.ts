import { createSection } from "./gridSections.js";
import { createSummaryPane } from "./summaryRenderer.js";
import type { LayoutPane, SummaryRow } from "@onegrid/core";
import type { DomGridOptions } from "./OneGrid.js";

export function getSummaryPlacements<TData>(
  options: DomGridOptions<TData>,
  summary: SummaryRow | undefined
): readonly ("top" | "bottom")[] {
  if (summary === undefined || options.summary?.enabled === false) {
    return [];
  }

  const position = options.summary?.position ?? "bottom";
  return position === "both" ? ["top", "bottom"] : [position];
}

export function createSummarySection<TData>(
  panes: Readonly<Record<"left" | "center" | "right", LayoutPane<TData>>>,
  summary: SummaryRow | undefined,
  position: "top" | "bottom",
  ariaRowIndex: number
): HTMLElement {
  const section = createSection("summary", panes, (pane) =>
    createSummaryPane(pane, summary, ariaRowIndex)
  );
  section.dataset.summaryPosition = position;
  return section;
}
