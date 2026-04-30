import type { ColumnModel, NormalizedDataColumn } from "../column/index.js";
import type {
  GridLayoutModel,
  GridLayoutModelOptions,
  LayoutPane,
  LayoutPaneKey
} from "./layoutTypes.js";

const PANE_ORDER: readonly LayoutPaneKey[] = ["left", "center", "right"];

export function createGridLayoutModel<TData>(
  columnModel: ColumnModel<TData>,
  options: GridLayoutModelOptions = {}
): GridLayoutModel<TData> {
  const left = createPane("left", columnModel.pinnedLeafColumns.left, 0);
  const center = createPane(
    "center",
    columnModel.pinnedLeafColumns.center,
    columnModel.pinnedLeafColumns.left.length
  );
  const right = createPane(
    "right",
    columnModel.pinnedLeafColumns.right,
    columnModel.pinnedLeafColumns.left.length + columnModel.pinnedLeafColumns.center.length
  );

  return Object.freeze({
    panes: Object.freeze({ left, center, right }),
    paneOrder: PANE_ORDER,
    sections: Object.freeze({
      header: true,
      body: true,
      summary: options.hasSummary === true,
      footer: options.hasFooter === true,
      overlay: options.hasOverlay !== false
    }),
    totalColumnWidth: left.width + center.width + right.width
  });
}

function createPane<TData>(
  key: LayoutPaneKey,
  columns: readonly NormalizedDataColumn<TData>[],
  ariaColumnOffset: number
): LayoutPane<TData> {
  const width = sumColumnWidth(columns);

  return Object.freeze({
    key,
    columns: Object.freeze([...columns]),
    width,
    columnTemplate: columns.map((column) => `${column.width}px`).join(" "),
    ariaColumnOffset,
    visible: key === "center" || columns.length > 0
  });
}

function sumColumnWidth<TData>(columns: readonly NormalizedDataColumn<TData>[]): number {
  return columns.reduce((total, column) => total + column.width, 0);
}
