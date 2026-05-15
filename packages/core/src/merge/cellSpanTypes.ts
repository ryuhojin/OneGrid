import type { RowKey } from "../types/shared.js";

export type CellSpanKind = "value" | "custom" | "server";

export interface CellSpanRow<TData = unknown> {
  readonly rowIndex: number;
  readonly rowKey: RowKey;
  readonly data: TData;
}

export interface CellSpan {
  readonly id: string;
  readonly kind: CellSpanKind;
  readonly rowIndex: number;
  readonly rowKey?: RowKey;
  readonly columnIndex: number;
  readonly columnId: string;
  readonly field: string;
  readonly rowSpan: number;
  readonly colSpan: number;
  readonly value?: unknown;
}

export interface CellSpanAnchorPosition {
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly rowKey?: RowKey;
  readonly columnId: string;
  readonly field: string;
}

export interface CellSpanModel {
  readonly spans: readonly CellSpan[];
  readonly byCell: ReadonlyMap<string, CellSpan>;
  readonly index: CellSpanIndex;
}

export interface CellSpanIndex {
  readonly byAnchorCell: ReadonlyMap<string, CellSpan>;
  readonly byRow: ReadonlyMap<number, readonly CellSpan[]>;
  readonly byColumn: ReadonlyMap<number, readonly CellSpan[]>;
  readonly coveredRowsBySpanId: ReadonlyMap<string, readonly number[]>;
  readonly coveredColumnsBySpanId: ReadonlyMap<string, readonly number[]>;
}

export interface CellSpanWindow {
  readonly firstRow: number;
  readonly lastRow: number;
  readonly firstColumn: number;
  readonly lastColumn: number;
}

export type CellSpanCellState = CellSpanAnchorState | CellSpanCoveredState;

export interface CellSpanAnchorState {
  readonly kind: "anchor";
  readonly span: CellSpan;
  readonly rowSpan: number;
  readonly colSpan: number;
  readonly clippedTop: boolean;
  readonly clippedLeft: boolean;
}

export interface CellSpanCoveredState {
  readonly kind: "covered";
  readonly span: CellSpan;
}

export interface CellSpanRange {
  readonly firstRow: number;
  readonly lastRow: number;
  readonly firstColumn: number;
  readonly lastColumn: number;
}
