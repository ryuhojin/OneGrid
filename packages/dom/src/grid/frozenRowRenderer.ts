import { createBodyPane } from "./bodyPaneRenderer.js";
import { createSection } from "./gridSections.js";
import type { LayoutPane } from "@onegrid/core";
import type { BodyPaneRuntime } from "./bodyPaneRenderer.js";
import type { BodyRowEntry } from "./bodyRowRenderer.js";

export interface FrozenRowSectionInput<TData> {
  readonly panes: Readonly<Record<"left" | "center" | "right", LayoutPane<TData>>>;
  readonly rows: readonly BodyRowEntry<TData>[];
  readonly position: "top" | "bottom";
  readonly rowIndexOffset: number;
  readonly runtime: BodyPaneRuntime<TData>;
  readonly centerOwnsTreeControls: boolean;
}

export interface FrozenRowsSectionSetInput<TData> {
  readonly grid: HTMLElement;
  readonly panes: Readonly<Record<"left" | "center" | "right", LayoutPane<TData>>>;
  readonly topRows: readonly BodyRowEntry<TData>[];
  readonly bottomRows: readonly BodyRowEntry<TData>[];
  readonly bottomOffset: number;
  readonly runtime: BodyPaneRuntime<TData>;
  readonly centerOwnsTreeControls: boolean;
}

export function appendFrozenRowsSections<TData>(
  input: FrozenRowsSectionSetInput<TData>
): void {
  if (input.topRows.length > 0) {
    input.grid.append(createFrozenRowsSection({
      panes: input.panes,
      rows: input.topRows,
      position: "top",
      rowIndexOffset: 0,
      runtime: input.runtime,
      centerOwnsTreeControls: input.centerOwnsTreeControls
    }));
  }

  if (input.bottomRows.length > 0) {
    input.grid.append(createFrozenRowsSection({
      panes: input.panes,
      rows: input.bottomRows,
      position: "bottom",
      rowIndexOffset: input.bottomOffset,
      runtime: input.runtime,
      centerOwnsTreeControls: input.centerOwnsTreeControls
    }));
  }
}

export function createFrozenRowsSection<TData>(
  input: FrozenRowSectionInput<TData>
): HTMLElement {
  const section = createSection("frozen", input.panes, (pane) =>
    createFrozenPane(input, pane)
  );
  section.dataset.frozenPosition = input.position;
  return section;
}

export function createFrozenPane<TData>(
  input: FrozenRowSectionInput<TData>,
  pane: LayoutPane<TData>
): HTMLElement {
  return createBodyPane(
    pane,
    input.rows,
    {
      ...input.runtime,
      rowIndexOffset: input.rowIndexOffset
    },
    input.centerOwnsTreeControls,
    undefined
  );
}
