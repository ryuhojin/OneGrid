import { createBodyRow } from "./bodyRowRenderer.js";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import { applyPaneVirtualInlineWindow } from "./paneVirtualStyles.js";
import type {
  CellSpanModel,
  CellSpanWindow,
  EditingOptions,
  FixedRowVirtualWindow,
  LayoutPane,
  SecurityOptions
} from "@onegrid/core";
import type { BodyRowEntry } from "./bodyRowRenderer.js";
import type { TreeRowRuntime } from "./treeRowRenderer.js";

export interface BodyPaneRuntime {
  readonly treeRuntime?: TreeRowRuntime;
  readonly groupRuntime?: GroupRowRuntime;
  readonly cellSpanModel?: CellSpanModel;
  readonly treeColumnField?: string;
  readonly security?: SecurityOptions;
  readonly editing?: EditingOptions;
}

export function createBodyPane<TData>(
  pane: LayoutPane<TData>,
  rows: readonly BodyRowEntry<TData>[],
  runtime: BodyPaneRuntime | undefined,
  centerOwnsTreeControls: boolean,
  virtualWindow: FixedRowVirtualWindow | undefined
): HTMLElement {
  const body = document.createElement("div");
  body.className = "og-grid__body";
  applyPaneVirtualInlineWindow(body, pane);
  const cellSpanWindow = createPaneCellSpanWindow(pane, rows, virtualWindow);

  appendVirtualSpacer(body, "top", virtualWindow?.beforeHeight ?? 0);

  rows.forEach((row, rowIndex) => {
    const absoluteRowIndex = (virtualWindow?.firstRow ?? 0) + rowIndex;
    body.append(createBodyRow({
      entry: row,
      rowIndex: absoluteRowIndex,
      columns: pane.columns,
      columnTemplate: pane.columnTemplate,
      ariaColumnOffset: pane.ariaColumnOffset,
      columnCount: pane.columns.length,
      renderTreeControls: pane.key === "left" || (pane.key === "center" && centerOwnsTreeControls),
      renderGroupLabel: pane.key === "center" || (pane.key === "left" && centerOwnsTreeControls),
      ...(runtime?.treeColumnField === undefined ? {} : { treeColumnField: runtime.treeColumnField }),
      exposeRowKey: pane.key === "center",
      ...(runtime?.groupRuntime === undefined ? {} : { groupRuntime: runtime.groupRuntime }),
      ...(runtime?.treeRuntime === undefined ? {} : { treeRuntime: runtime.treeRuntime }),
      ...(runtime?.cellSpanModel === undefined ? {} : { cellSpanModel: runtime.cellSpanModel }),
      ...(runtime?.security === undefined ? {} : { security: runtime.security }),
      ...(runtime?.editing === undefined ? {} : { editing: runtime.editing }),
      ...(cellSpanWindow === undefined ? {} : { cellSpanWindow })
    }));
  });

  appendVirtualSpacer(body, "bottom", virtualWindow?.afterHeight ?? 0);
  return body;
}

function appendVirtualSpacer(
  body: HTMLElement,
  position: "top" | "bottom",
  height: number
): void {
  if (height <= 0) {
    return;
  }

  const spacer = document.createElement("div");
  spacer.className = "og-grid__virtual-spacer";
  spacer.dataset.virtualSpacer = position;
  spacer.setAttribute("role", "presentation");
  spacer.style.blockSize = `${height}px`;
  body.append(spacer);
}

function createPaneCellSpanWindow<TData>(
  pane: LayoutPane<TData>,
  rows: readonly BodyRowEntry<TData>[],
  virtualWindow: FixedRowVirtualWindow | undefined
): CellSpanWindow | undefined {
  if (rows.length === 0 || pane.columns.length === 0) {
    return undefined;
  }

  return {
    firstRow: getFirstRenderedRowIndex(rows, virtualWindow),
    lastRow: getLastRenderedRowIndex(rows, virtualWindow),
    firstColumn: pane.ariaColumnOffset,
    lastColumn: pane.ariaColumnOffset + pane.columns.length - 1
  };
}

function getFirstRenderedRowIndex<TData>(
  rows: readonly BodyRowEntry<TData>[],
  virtualWindow: FixedRowVirtualWindow | undefined
): number {
  const first = rows[0];
  if (first && "rowIndex" in first) {
    return first.rowIndex;
  }

  return virtualWindow?.firstRow ?? 0;
}

function getLastRenderedRowIndex<TData>(
  rows: readonly BodyRowEntry<TData>[],
  virtualWindow: FixedRowVirtualWindow | undefined
): number {
  const last = rows[rows.length - 1];
  if (last && "rowIndex" in last) {
    return last.rowIndex;
  }

  return (virtualWindow?.firstRow ?? 0) + rows.length - 1;
}
