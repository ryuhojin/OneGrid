import type {
  CellSpanCellState,
  CellSpanModel,
  CellSpanWindow,
  ClientRowModelEntry,
  EditingOptions,
  InfiniteRowEntry,
  LocaleFormatterBridge,
  NormalizedDataColumn,
  SecurityOptions,
  ServerRowEntry,
  TreeRowEntry,
  ViewportRowEntry
} from "@onegrid/core";
import { getCellSpanState, isCellEditable, resolveEditorDef, resolveEditStartMode } from "@onegrid/core";
import { createGroupFooterRow, createGroupRow } from "./groupRowRenderer.js";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import { readCellValue, renderCellHost } from "./rendererHost.js";
import { createTreeBodyRow } from "./treeRowRenderer.js";
import type { TreeRowRuntime } from "./treeRowRenderer.js";
import type { BodyRowHeightResolver } from "./rowHeightRuntime.js";

export type BodyRowEntry<TData> =
  | ClientRowModelEntry<TData>
  | InfiniteRowEntry<TData>
  | ServerRowEntry<TData>
  | ViewportRowEntry<TData>
  | TreeRowEntry<TData>;

export interface BodyRowRenderOptions<TData> {
  readonly entry: BodyRowEntry<TData>;
  readonly rowIndex: number;
  readonly columns: readonly NormalizedDataColumn<TData>[];
  readonly columnTemplate: string;
  readonly ariaColumnOffset: number;
  readonly columnCount: number;
  readonly renderTreeControls: boolean;
  readonly renderGroupLabel: boolean;
  readonly treeColumnField?: string;
  readonly exposeRowKey: boolean;
  readonly groupRuntime?: GroupRowRuntime;
  readonly treeRuntime?: TreeRowRuntime;
  readonly cellSpanModel?: CellSpanModel;
  readonly cellSpanWindow?: CellSpanWindow;
  readonly security?: SecurityOptions;
  readonly editing?: EditingOptions;
  readonly i18n: LocaleFormatterBridge;
  readonly rowHeight?: BodyRowHeightResolver<TData>;
  readonly autoRowHeight?: boolean;
  readonly getRowSpanHeight?: (rowIndex: number, rowSpan: number) => number | undefined;
}

export function createBodyRow<TData>(options: BodyRowRenderOptions<TData>): HTMLElement {
  if (options.entry.kind === "group") {
    return createGroupRow({
      ...options,
      entry: options.entry,
      renderLabel: options.renderGroupLabel,
      ...(options.groupRuntime === undefined ? {} : { runtime: options.groupRuntime })
    });
  }

  if (options.entry.kind === "groupFooter") {
    return createGroupFooterRow({
      ...options,
      entry: options.entry,
      renderLabel: options.renderGroupLabel
    });
  }

  if (options.entry.kind === "tree") {
    return createTreeBodyRow(options.entry, options.columns, options.columnTemplate, {
      ariaColumnOffset: options.ariaColumnOffset,
      renderTreeControls: options.renderTreeControls,
      ...(options.treeColumnField === undefined ? {} : { treeColumnField: options.treeColumnField }),
      exposeRowKey: options.exposeRowKey,
      runtime: options.treeRuntime
    });
  }

  if (options.entry.kind === "skeleton") {
    return createSkeletonRow(options);
  }

  return createDataRow(
    options.entry.data,
    options.entry.key,
    "rowIndex" in options.entry ? options.entry.rowIndex : options.rowIndex,
    "sourceIndex" in options.entry ? options.entry.sourceIndex : undefined,
    options.columns,
    options.columnTemplate,
    options.ariaColumnOffset,
    options.exposeRowKey,
    options.cellSpanModel,
    options.cellSpanWindow,
    options.security,
    options.editing,
    options.i18n,
    options.rowHeight,
    options.autoRowHeight === true,
    options.getRowSpanHeight
  );
}

function createDataRow<TData>(
  rowData: TData,
  rowKey: string | number,
  rowIndex: number,
  sourceIndex: number | undefined,
  columns: readonly NormalizedDataColumn<TData>[],
  columnTemplate: string,
  ariaColumnOffset: number,
  exposeRowKey: boolean,
  cellSpanModel: CellSpanModel | undefined,
  cellSpanWindow: CellSpanWindow | undefined,
  security: SecurityOptions | undefined,
  editing: EditingOptions | undefined,
  i18n: LocaleFormatterBridge,
  rowHeight: BodyRowHeightResolver<TData> | undefined,
  autoRowHeight: boolean,
  getRowSpanHeight: ((rowIndex: number, rowSpan: number) => number | undefined) | undefined
): HTMLElement {
  const row = createPaneRow(getBodyRowClassName(autoRowHeight), columnTemplate, rowIndex, rowKey, exposeRowKey);
  applyRowHeight(row, rowHeight?.(rowData, rowIndex));

  columns.forEach((column, columnIndex) => {
    const globalColumnIndex = ariaColumnOffset + columnIndex;
    const spanState = cellSpanModel && cellSpanWindow
      ? getCellSpanState(cellSpanModel, rowIndex, globalColumnIndex, cellSpanWindow)
      : undefined;
    const cell = createDataCell({
      rowData,
      column,
      columnIndex,
      ariaColumnIndex: globalColumnIndex + 1,
      rowKey,
      rowIndex,
      ...(sourceIndex === undefined ? {} : { sourceIndex }),
      ...(editing === undefined ? {} : { editing }),
      i18n,
      ...(security === undefined ? {} : { security }),
      ...(spanState === undefined ? {} : { spanState }),
      ...(getRowSpanHeight === undefined ? {} : { getRowSpanHeight })
    });
    row.append(cell);
  });

  return row;
}

function getBodyRowClassName(autoRowHeight: boolean): string {
  return autoRowHeight ? "og-grid__row og-grid__row--auto-height" : "og-grid__row";
}

function applyRowHeight(row: HTMLElement, height: number | undefined): void {
  if (height !== undefined) {
    row.style.setProperty("--og-row-height", `${height}px`);
  }
}

function createSkeletonRow<TData>(options: BodyRowRenderOptions<TData>): HTMLElement {
  const rowIndex = "rowIndex" in options.entry ? options.entry.rowIndex : options.rowIndex;
  const row = createPaneRow(
    "og-grid__row og-grid__skeleton-row",
    options.columnTemplate,
    rowIndex,
    `skeleton-${rowIndex}`,
    options.exposeRowKey
  );

  options.columns.forEach((column, columnIndex) => {
    const cell = createCell(
      "og-grid__cell og-grid__skeleton-cell",
      column,
      options.ariaColumnOffset + columnIndex + 1
    );
    cell.textContent = options.i18n.text.loadingRows;
    row.append(cell);
  });

  return row;
}

function createPaneRow(
  className: string,
  columnTemplate: string,
  rowIndex: number,
  rowKey: string | number,
  exposeRowKey: boolean
): HTMLElement {
  const row = document.createElement("div");
  row.className = className;
  row.style.gridTemplateColumns = columnTemplate;
  row.setAttribute("role", "row");
  row.setAttribute("aria-rowindex", String(rowIndex + 1));
  if (exposeRowKey) {
    row.dataset.rowKey = String(rowKey);
  }
  return row;
}

function createCell<TData>(
  baseClassName: string,
  column: NormalizedDataColumn<TData>,
  ariaColumnIndex: number,
  columnIndex?: number
): HTMLElement {
  const cell = document.createElement("div");
  cell.className = getCellClassName(baseClassName, column);
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-colindex", String(ariaColumnIndex));
  cell.dataset.columnId = column.id;
  if (columnIndex !== undefined) {
    cell.style.gridColumn = String(columnIndex + 1);
  }
  return cell;
}

function createDataCell<TData>(input: {
  readonly rowData: TData;
  readonly column: NormalizedDataColumn<TData>;
  readonly columnIndex: number;
  readonly ariaColumnIndex: number;
  readonly rowKey: string | number;
  readonly rowIndex: number;
  readonly sourceIndex?: number;
  readonly security?: SecurityOptions;
  readonly editing?: EditingOptions;
  readonly i18n: LocaleFormatterBridge;
  readonly spanState?: CellSpanCellState;
  readonly getRowSpanHeight?: (rowIndex: number, rowSpan: number) => number | undefined;
}): HTMLElement {
  if (input.spanState?.kind === "covered") {
    return createCoveredCell(
      input.column,
      input.columnIndex,
      input.ariaColumnIndex,
      input.spanState
    );
  }

  const cell = createCell(
    "og-grid__cell",
    input.column,
    input.ariaColumnIndex,
    input.columnIndex
  );
  const value = input.spanState?.kind === "anchor"
    ? input.spanState.span.value
    : readCellValue(input.rowData, input.rowKey, input.rowIndex, input.column);
  applyEditMetadata(cell, input, value);
  renderCellHost({
    cell,
    rowData: input.rowData,
    rowKey: input.rowKey,
    rowIndex: input.rowIndex,
    column: input.column,
    value,
    i18n: input.i18n,
    ...(input.security === undefined ? {} : { security: input.security })
  });

  if (input.spanState?.kind === "anchor") {
    applyAnchorSpan(
      cell,
      input.spanState,
      input.getRowSpanHeight?.(input.rowIndex, input.spanState.rowSpan)
    );
  }

  return cell;
}

function applyEditMetadata<TData>(
  cell: HTMLElement,
  input: {
    readonly rowData: TData;
    readonly column: NormalizedDataColumn<TData>;
    readonly rowKey: string | number;
    readonly rowIndex: number;
    readonly sourceIndex?: number;
    readonly editing?: EditingOptions;
    readonly i18n: LocaleFormatterBridge;
  },
  value: unknown
): void {
  cell.dataset.editRowKey = String(input.rowKey);
  cell.dataset.rowIndex = String(input.rowIndex);
  cell.dataset.field = input.column.field;
  if (input.sourceIndex !== undefined) {
    cell.dataset.sourceIndex = String(input.sourceIndex);
  }

  const editable = isCellEditable(input.column.source, {
    ...input.i18n,
    row: input.rowData,
    rowIndex: input.rowIndex,
    rowKey: input.rowKey,
    column: input.column.source,
    columnId: input.column.id,
    field: input.column.field,
    value,
    position: {
      rowIndex: input.rowIndex,
      rowKey: input.rowKey,
      columnId: input.column.id,
      field: input.column.field
    }
  }, input.editing);
  cell.setAttribute("aria-readonly", editable ? "false" : "true");
  if (editable) {
    const editorKind = resolveEditorDef(input.column.source).kind;
    const editStartMode = resolveEditStartMode(input.column.source, input.editing);
    cell.classList.add("og-grid__cell--editable");
    cell.classList.add(`og-grid__cell--editor-${editorKind}`);
    cell.dataset.editable = "true";
    cell.dataset.editorKind = editorKind;
    cell.dataset.editStartMode = editStartMode;
  }
}

function createCoveredCell<TData>(
  column: NormalizedDataColumn<TData>,
  columnIndex: number,
  ariaColumnIndex: number,
  spanState: Extract<CellSpanCellState, { readonly kind: "covered" }>
): HTMLElement {
  const cell = createCell("og-grid__cell", column, ariaColumnIndex, columnIndex);
  cell.classList.add("og-grid__cell--merged-covered");
  cell.setAttribute("role", "presentation");
  cell.setAttribute("aria-hidden", "true");
  cell.dataset.mergedBy = spanState.span.id;
  return cell;
}

function applyAnchorSpan(
  cell: HTMLElement,
  state: Extract<CellSpanCellState, { readonly kind: "anchor" }>,
  blockSize: number | undefined
): void {
  cell.classList.add("og-grid__cell--merged");
  if (state.clippedTop) {
    cell.classList.add("og-grid__cell--merged-clipped-top");
  }
  if (state.clippedLeft) {
    cell.classList.add("og-grid__cell--merged-clipped-left");
  }
  cell.style.gridColumn = `${cell.style.gridColumn} / span ${state.colSpan}`;
  cell.style.setProperty("--og-cell-row-span", String(state.rowSpan));
  if (blockSize !== undefined && blockSize > 0) {
    cell.style.setProperty("--og-cell-row-span-height", `${blockSize}px`);
  }
  cell.setAttribute("aria-rowspan", String(state.rowSpan));
  cell.setAttribute("aria-colspan", String(state.colSpan));
  cell.dataset.cellSpanId = state.span.id;
  cell.dataset.cellSpanKind = state.span.kind;
}

function getCellClassName<TData>(baseClassName: string, column: NormalizedDataColumn<TData>): string {
  return column.pinned ? `${baseClassName} ${baseClassName}--pinned-${column.pinned}` : baseClassName;
}
