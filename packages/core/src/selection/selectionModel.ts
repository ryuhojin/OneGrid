import { expandCellSpanRangeFromEndpoints } from "../merge/cellSpanWindow.js";
import type { CellSpanModel, CellSpanRange } from "../merge/cellSpanTypes.js";
import type { FilterModel, RowKey, RowModelKind, SortModel } from "../types/shared.js";

export type GridSelectionMode = "none" | "row" | "cell" | "range";

export interface SelectedCell {
  readonly rowKey: RowKey;
  readonly rowIndex: number;
  readonly field: string;
  readonly columnIndex: number;
}

export interface SelectedRange extends CellSpanRange {
  readonly id: string;
  readonly anchor: SelectedCell;
  readonly focus: SelectedCell;
}

export interface ServerSelectionToken {
  readonly kind: "server-dataset";
  readonly token: string;
  readonly rowModel: RowModelKind;
  readonly issuedAt: string;
}

export interface GridSelectionState {
  readonly mode: GridSelectionMode;
  readonly rowKeys: readonly RowKey[];
  readonly cells: readonly SelectedCell[];
  readonly ranges: readonly SelectedRange[];
  readonly allRowsToken?: ServerSelectionToken;
}

export interface SelectionPolicy {
  readonly mode?: GridSelectionMode;
  readonly multiple?: boolean;
}

export interface SelectRangeInput {
  readonly anchor: SelectedCell;
  readonly focus: SelectedCell;
  readonly additive?: boolean;
  readonly cellSpanModel?: CellSpanModel;
}

export interface ServerSelectionTokenInput {
  readonly rowModel: RowModelKind;
  readonly filterModel?: FilterModel;
  readonly sortModel?: readonly SortModel[];
  readonly snapshotVersion?: string;
  readonly tokenPrefix?: string;
  readonly issuedAt?: string;
}

export function createSelectionState(
  policy: SelectionPolicy | undefined = undefined
): GridSelectionState {
  return freezeSelectionState({
    mode: policy?.mode ?? "row",
    rowKeys: [],
    cells: [],
    ranges: []
  });
}

export function selectRows(
  state: GridSelectionState,
  rowKeys: readonly RowKey[],
  policy: SelectionPolicy | undefined = undefined
): GridSelectionState {
  void state;
  const nextKeys = normalizeRowKeys(policy?.multiple === false ? rowKeys.slice(0, 1) : rowKeys);
  return freezeSelectionState({
    mode: "row",
    rowKeys: nextKeys,
    cells: [],
    ranges: []
  });
}

export function toggleRowSelection(
  state: GridSelectionState,
  rowKey: RowKey,
  policy: SelectionPolicy | undefined = undefined
): GridSelectionState {
  const selected = new Set(state.rowKeys);
  if (selected.has(rowKey)) {
    selected.delete(rowKey);
  } else {
    if (policy?.multiple === false) {
      selected.clear();
    }
    selected.add(rowKey);
  }

  return selectRows(state, [...selected], { ...policy, multiple: true });
}

export function selectCell(
  state: GridSelectionState,
  cell: SelectedCell,
  additive = false
): GridSelectionState {
  const cells = additive ? [...state.cells, cell] : [cell];
  return freezeSelectionState({
    mode: "cell",
    rowKeys: [],
    cells: dedupeCells(cells),
    ranges: additive ? state.ranges : []
  });
}

export function selectCellRange(
  state: GridSelectionState,
  input: SelectRangeInput
): GridSelectionState {
  const range = createRange(input.anchor, input.focus, input.cellSpanModel);
  return freezeSelectionState({
    mode: "range",
    rowKeys: [],
    cells: [],
    ranges: input.additive ? [...state.ranges, range] : [range]
  });
}

export function selectAllVisibleRows(
  state: GridSelectionState,
  visibleRowKeys: readonly RowKey[]
): GridSelectionState {
  return selectRows(state, visibleRowKeys, { mode: "row", multiple: true });
}

export function selectServerDataset(
  state: GridSelectionState,
  input: ServerSelectionTokenInput
): GridSelectionState {
  return freezeSelectionState({
    ...state,
    mode: "row",
    rowKeys: [],
    cells: [],
    ranges: [],
    allRowsToken: createServerSelectionToken(input)
  });
}

export function clearSelection(state: GridSelectionState): GridSelectionState {
  return freezeSelectionState({
    mode: state.mode,
    rowKeys: [],
    cells: [],
    ranges: []
  });
}

export function isRowSelected(state: GridSelectionState, rowKey: RowKey): boolean {
  return state.rowKeys.includes(rowKey);
}

export function isCellSelected(state: GridSelectionState, cell: SelectedCell): boolean {
  return state.cells.some((item) => sameCell(item, cell))
    || state.ranges.some((range) => isCellInRange(cell, range));
}

export function createServerSelectionToken(input: ServerSelectionTokenInput): ServerSelectionToken {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const payload = stableStringify({
    rowModel: input.rowModel,
    filterModel: input.filterModel ?? {},
    sortModel: input.sortModel ?? [],
    snapshotVersion: input.snapshotVersion ?? ""
  });
  const prefix = input.tokenPrefix ?? "onegrid";
  return Object.freeze({
    kind: "server-dataset",
    token: `${prefix}:${hashString(payload)}`,
    rowModel: input.rowModel,
    issuedAt
  });
}

function createRange(
  anchor: SelectedCell,
  focus: SelectedCell,
  cellSpanModel: CellSpanModel | undefined
): SelectedRange {
  const base = {
    firstRow: Math.min(anchor.rowIndex, focus.rowIndex),
    lastRow: Math.max(anchor.rowIndex, focus.rowIndex),
    firstColumn: Math.min(anchor.columnIndex, focus.columnIndex),
    lastColumn: Math.max(anchor.columnIndex, focus.columnIndex)
  };
  const expanded = cellSpanModel
    ? expandCellSpanRangeFromEndpoints(cellSpanModel, base, [anchor, focus])
    : base;
  return Object.freeze({
    id: `range:${expanded.firstRow}:${expanded.firstColumn}:${expanded.lastRow}:${expanded.lastColumn}`,
    anchor,
    focus,
    ...expanded
  });
}

function isCellInRange(cell: SelectedCell, range: CellSpanRange): boolean {
  return cell.rowIndex >= range.firstRow
    && cell.rowIndex <= range.lastRow
    && cell.columnIndex >= range.firstColumn
    && cell.columnIndex <= range.lastColumn;
}

function dedupeCells(cells: readonly SelectedCell[]): readonly SelectedCell[] {
  const seen = new Set<string>();
  const result: SelectedCell[] = [];
  for (const cell of cells) {
    const key = createCellKey(cell);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cell);
    }
  }
  return Object.freeze(result);
}

function normalizeRowKeys(rowKeys: readonly RowKey[]): readonly RowKey[] {
  return Object.freeze([...new Set(rowKeys)]);
}

function sameCell(left: SelectedCell, right: SelectedCell): boolean {
  return createCellKey(left) === createCellKey(right);
}

function createCellKey(cell: SelectedCell): string {
  return `${String(cell.rowKey)}:${cell.rowIndex}:${cell.field}:${cell.columnIndex}`;
}

function freezeSelectionState(state: GridSelectionState): GridSelectionState {
  Object.freeze(state.rowKeys);
  Object.freeze(state.cells);
  Object.freeze(state.ranges);
  return Object.freeze(state);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
