import type { NormalizedDataColumn } from "../column/index.js";

export type LayoutPaneKey = "left" | "center" | "right";

export type LayoutSectionKey = "header" | "frozen" | "body" | "summary" | "footer" | "overlay";

export interface LayoutPane<TData = unknown> {
  readonly key: LayoutPaneKey;
  readonly columns: readonly NormalizedDataColumn<TData>[];
  readonly width: number;
  readonly columnTemplate: string;
  readonly ariaColumnOffset: number;
  readonly visible: boolean;
  readonly virtual?: LayoutPaneVirtualization;
}

export interface LayoutPaneVirtualization {
  readonly firstColumn: number;
  readonly lastColumn: number;
  readonly offsetLeft: number;
  readonly renderedWidth: number;
  readonly totalWidth: number;
}

export interface GridLayoutModel<TData = unknown> {
  readonly panes: Readonly<Record<LayoutPaneKey, LayoutPane<TData>>>;
  readonly paneOrder: readonly LayoutPaneKey[];
  readonly sections: Readonly<Record<LayoutSectionKey, boolean>>;
  readonly totalColumnWidth: number;
}

export interface GridLayoutModelOptions {
  readonly hasSummary?: boolean;
  readonly hasFooter?: boolean;
  readonly hasOverlay?: boolean;
}
