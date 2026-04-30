import type { NormalizedDataColumn } from "../column/index.js";
import type { PinnedSide } from "../types/shared.js";

export type HeaderCellKind = "group" | "column" | "merge";

export type HeaderPinnedRegion = "left" | "center" | "right";

export interface HeaderModel<TData = unknown> {
  readonly depth: number;
  readonly tree: readonly HeaderTreeNode<TData>[];
  readonly rows: readonly HeaderRow[];
  readonly regions: HeaderRegionModel;
  readonly leafColumns: readonly NormalizedDataColumn<TData>[];
  readonly ariaLabels: ReadonlyMap<string, string>;
}

export interface HeaderTreeNode<TData = unknown> {
  readonly id: string;
  readonly kind: Exclude<HeaderCellKind, "merge">;
  readonly headerName: string;
  readonly depth: number;
  readonly columnIds: readonly string[];
  readonly pinned: PinnedSide | undefined;
  readonly sourceId: string;
  readonly ariaLabel: string;
  readonly children: readonly HeaderTreeNode<TData>[];
}

export interface HeaderRow {
  readonly depth: number;
  readonly cells: readonly HeaderCell[];
}

export interface HeaderCell {
  readonly id: string;
  readonly kind: HeaderCellKind;
  readonly sourceId: string;
  readonly headerName: string;
  readonly depth: number;
  readonly rowSpan: number;
  readonly colSpan: number;
  readonly startLeafIndex: number;
  readonly endLeafIndex: number;
  readonly columnIds: readonly string[];
  readonly pinned: PinnedSide | undefined;
  readonly ariaLabel: string;
  readonly labels?: readonly HeaderLabel[];
}

export interface HeaderLabel {
  readonly id: string;
  readonly text: string;
  readonly targetCellId: string;
  readonly columnIds: readonly string[];
  readonly ariaLabel: string;
}

export interface HeaderRegionModel {
  readonly left: HeaderRegion;
  readonly center: HeaderRegion;
  readonly right: HeaderRegion;
}

export interface HeaderRegion {
  readonly region: HeaderPinnedRegion;
  readonly rows: readonly HeaderRow[];
}
