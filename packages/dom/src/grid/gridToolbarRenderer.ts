import type { ClientPivotMeta, ColumnModel } from "@onegrid/core";
import { createColumnToolbar } from "./columnControls.js";
import type { ColumnUiRuntime, resolveColumnUiOptions } from "./columnControls.js";
import { createFilterToolbar } from "./filterToolbar.js";
import type { HeaderFilterRuntime } from "./filterRuntime.js";
import type { DomGridOptions } from "./OneGrid.js";
import { createPaginationToolbar } from "./paginationRenderer.js";
import type {
  GridPaginationRuntime,
  PaginationRenderModel
} from "./paginationRenderer.js";
import { createPivotToolbar } from "./pivotPanel.js";
import type { GridSelectionRuntime } from "./selectionRuntime.js";
import { createSelectionToolbar } from "./selectionToolbar.js";

export interface GridToolbarInput<TData> {
  readonly shell: HTMLElement;
  readonly columnModel: ColumnModel<TData>;
  readonly columnUi: ReturnType<typeof resolveColumnUiOptions>;
  readonly columnUiRuntime?: ColumnUiRuntime;
  readonly options: DomGridOptions<TData>;
  readonly selectionRuntime?: GridSelectionRuntime;
  readonly filterRuntime?: HeaderFilterRuntime;
  readonly pivotMeta?: ClientPivotMeta;
  readonly paginationRuntime?: GridPaginationRuntime;
  readonly paginationModel?: PaginationRenderModel;
}

export function appendTopToolbars<TData>(input: GridToolbarInput<TData>): void {
  appendPagination(input.shell, input.paginationRuntime, input.paginationModel, "top");

  const pivotToolbar = createPivotToolbar(input.options, input.pivotMeta);
  if (pivotToolbar) {
    input.shell.append(pivotToolbar);
  }

  const columnToolbar = createColumnToolbar(
    input.columnModel,
    input.columnUi,
    input.columnUiRuntime
  );
  if (columnToolbar) {
    input.shell.append(columnToolbar);
  }

  const selectionToolbar = createSelectionToolbar(input.options.selection, input.selectionRuntime);
  if (selectionToolbar) {
    input.shell.append(selectionToolbar);
  }

  const filterToolbar = createFilterToolbar(input.options.filtering, input.filterRuntime);
  if (filterToolbar) {
    input.shell.append(filterToolbar);
  }
}

export function appendBottomPagination<TData>(input: GridToolbarInput<TData>): void {
  appendPagination(input.shell, input.paginationRuntime, input.paginationModel, "bottom");
}

function appendPagination(
  shell: HTMLElement,
  runtime: GridPaginationRuntime | undefined,
  model: PaginationRenderModel | undefined,
  placement: "top" | "bottom"
): void {
  const toolbar = runtime && model ? createPaginationToolbar(model, runtime, placement) : undefined;
  if (toolbar) {
    shell.append(toolbar);
  }
}
