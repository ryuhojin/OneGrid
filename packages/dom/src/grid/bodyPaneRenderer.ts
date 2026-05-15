import { createBodyRow } from "./bodyRowRenderer.js";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import { applyPaneVirtualInlineWindow } from "./paneVirtualStyles.js";
import type {
  CellSpanModel,
  CellSpanWindow,
  EditingOptions,
  FixedRowVirtualWindow,
  LocaleFormatterBridge,
  LayoutPane,
  SecurityOptions
} from "@onegrid/core";
import { createLocaleFormatter } from "@onegrid/core";
import type { BodyRowEntry } from "./bodyRowRenderer.js";
import type { TreeRowRuntime } from "./treeRowRenderer.js";
import type { BodyRowHeightResolver } from "./rowHeightRuntime.js";

export interface BodyPaneRuntime<TData = unknown> {
  readonly treeRuntime?: TreeRowRuntime;
  readonly groupRuntime?: GroupRowRuntime;
  readonly cellSpanModel?: CellSpanModel;
  readonly rowIndexOffset?: number;
  readonly treeColumnField?: string;
  readonly security?: SecurityOptions;
  readonly editing?: EditingOptions;
  readonly i18n: LocaleFormatterBridge;
  readonly rowHeight?: BodyRowHeightResolver<TData>;
  readonly autoRowHeight?: boolean;
}

export function createBodyPane<TData>(
  pane: LayoutPane<TData>,
  rows: readonly BodyRowEntry<TData>[],
  runtime: BodyPaneRuntime<TData> | undefined,
  centerOwnsTreeControls: boolean,
  virtualWindow: FixedRowVirtualWindow | undefined
): HTMLElement {
  const body = document.createElement("div");
  body.className = "og-grid__body";
  applyPaneVirtualInlineWindow(body, pane);
  applyRowVirtualOffset(body, virtualWindow);
  const rowIndexOffset = runtime?.rowIndexOffset ?? 0;
  const i18n = runtime?.i18n ?? createLocaleFormatter();
  const cellSpanWindow = createPaneCellSpanWindow(pane, rows, virtualWindow, rowIndexOffset);
  const getRowSpanHeight = createRowSpanHeightResolver(rows, runtime, virtualWindow, rowIndexOffset);

  appendVirtualSpacer(body, "top", virtualWindow?.beforeHeight ?? 0);

  rows.forEach((row, rowIndex) => {
    const absoluteRowIndex = rowIndexOffset + (virtualWindow?.firstRow ?? 0) + rowIndex;
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
      i18n,
      ...(runtime?.rowHeight === undefined ? {} : { rowHeight: runtime.rowHeight }),
      ...(runtime?.autoRowHeight === true ? { autoRowHeight: true } : {}),
      ...(getRowSpanHeight === undefined ? {} : { getRowSpanHeight }),
      ...(cellSpanWindow === undefined ? {} : { cellSpanWindow })
    }));
  });

  appendVirtualSpacer(body, "bottom", virtualWindow?.afterHeight ?? 0);
  return body;
}

function createRowSpanHeightResolver<TData>(
  rows: readonly BodyRowEntry<TData>[],
  runtime: BodyPaneRuntime<TData> | undefined,
  virtualWindow: FixedRowVirtualWindow | undefined,
  rowIndexOffset: number
): ((rowIndex: number, rowSpan: number) => number | undefined) | undefined {
  if (!runtime?.rowHeight && !virtualWindow) {
    return undefined;
  }

  const rowHeights = new Map<number, number>();
  rows.forEach((entry, rowOffset) => {
    if (!("data" in entry)) {
      return;
    }

    const rowIndex = "rowIndex" in entry
      ? entry.rowIndex
      : rowIndexOffset + (virtualWindow?.firstRow ?? 0) + rowOffset;
    const rowHeight = runtime?.rowHeight?.(entry.data, rowIndex) ?? virtualWindow?.rowHeight;
    if (rowHeight !== undefined && rowHeight > 0) {
      rowHeights.set(rowIndex, rowHeight);
    }
  });

  return (rowIndex, rowSpan) => {
    if (rowSpan <= 1) {
      return undefined;
    }

    let blockSize = 0;
    for (let offset = 0; offset < rowSpan; offset += 1) {
      const rowHeight = rowHeights.get(rowIndex + offset) ?? virtualWindow?.rowHeight;
      if (rowHeight === undefined || rowHeight <= 0) {
        return undefined;
      }
      blockSize += rowHeight;
    }
    return blockSize;
  };
}

function applyRowVirtualOffset(
  body: HTMLElement,
  virtualWindow: FixedRowVirtualWindow | undefined
): void {
  if (!virtualWindow || virtualWindow.offsetTop >= 0) {
    return;
  }

  const rowOffset = `translateY(${virtualWindow.offsetTop}px)`;
  body.style.transform = body.style.transform
    ? `${body.style.transform} ${rowOffset}`
    : rowOffset;
  body.style.transformOrigin = "0 0";
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
  virtualWindow: FixedRowVirtualWindow | undefined,
  rowIndexOffset = 0
): CellSpanWindow | undefined {
  if (rows.length === 0 || pane.columns.length === 0) {
    return undefined;
  }

  return {
    firstRow: getFirstRenderedRowIndex(rows, virtualWindow, rowIndexOffset),
    lastRow: getLastRenderedRowIndex(rows, virtualWindow, rowIndexOffset),
    firstColumn: pane.ariaColumnOffset,
    lastColumn: pane.ariaColumnOffset + pane.columns.length - 1
  };
}

function getFirstRenderedRowIndex<TData>(
  rows: readonly BodyRowEntry<TData>[],
  virtualWindow: FixedRowVirtualWindow | undefined,
  rowIndexOffset: number
): number {
  const first = rows[0];
  if (first && "rowIndex" in first) {
    return first.rowIndex;
  }

  return rowIndexOffset + (virtualWindow?.firstRow ?? 0);
}

function getLastRenderedRowIndex<TData>(
  rows: readonly BodyRowEntry<TData>[],
  virtualWindow: FixedRowVirtualWindow | undefined,
  rowIndexOffset: number
): number {
  const last = rows[rows.length - 1];
  if (last && "rowIndex" in last) {
    return last.rowIndex;
  }

  return rowIndexOffset + (virtualWindow?.firstRow ?? 0) + rows.length - 1;
}
