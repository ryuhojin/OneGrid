import { createLocaleFormatter } from "@onegrid/core";
import { createFrozenPane } from "./frozenRowRenderer.js";
import type {
  CellSpanModel,
  FrozenRowSlices,
  LayoutPane
} from "@onegrid/core";
import type { BodyRowEntry } from "./bodyRowRenderer.js";
import type { DomGridOptions } from "./OneGrid.js";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import type { PaneRenderState } from "./virtualColumnWindow.js";
import type { RowRenderState } from "./renderGridShell.js";

export interface FrozenCenterPaneReplacementInput<TData> {
  readonly grid: HTMLElement;
  readonly options: DomGridOptions<TData>;
  readonly pane: LayoutPane<TData>;
  readonly paneState: PaneRenderState<TData>;
  readonly frozenRows: FrozenRowSlices<BodyRowEntry<TData>>;
  readonly rowRenderState: RowRenderState<TData> | undefined;
  readonly cellSpanModel: CellSpanModel;
  readonly groupRuntime?: GroupRowRuntime;
  readonly centerOwnsTreeControls: boolean;
  readonly security?: DomGridOptions<TData>["security"];
}

export function replaceFrozenCenterPanes<TData>(
  input: FrozenCenterPaneReplacementInput<TData>
): void {
  for (const position of ["top", "bottom"] as const) {
    const rows = position === "top" ? input.frozenRows.topRows : input.frozenRows.bottomRows;
    const rowIndexOffset = position === "top" ? 0 : input.frozenRows.bottomOffset;
    input.grid
      .querySelectorAll<HTMLElement>(
        `[data-layout-section="frozen"][data-frozen-position="${position}"] [data-layout-pane="center"]`
      )
      .forEach((paneElement) => {
        paneElement.replaceChildren(createFrozenPane({
          panes: input.paneState.panes,
          rows,
          position,
          rowIndexOffset,
          runtime: {
            ...(input.rowRenderState?.treeRuntime === undefined
              ? {}
              : { treeRuntime: input.rowRenderState.treeRuntime }),
            ...(input.rowRenderState?.treeRuntime?.treeColumnField === undefined
              ? {}
              : { treeColumnField: input.rowRenderState.treeRuntime.treeColumnField }),
            ...(input.groupRuntime === undefined ? {} : { groupRuntime: input.groupRuntime }),
            cellSpanModel: input.cellSpanModel,
            i18n: createLocaleFormatter(input.options.locale),
            ...(input.options.editing === undefined ? {} : { editing: input.options.editing }),
            ...(input.security === undefined ? {} : { security: input.security })
          },
          centerOwnsTreeControls: input.centerOwnsTreeControls
        }, input.pane));
      });
  }
}
