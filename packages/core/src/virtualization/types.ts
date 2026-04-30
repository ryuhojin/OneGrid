export interface VirtualizationOptions {
  readonly enabled?: boolean;
  readonly rowHeight?: number;
  readonly estimatedRowHeight?: number;
  readonly overscan?: number | OverscanOptions;
  readonly maxDomRows?: number;
  readonly segmented?: boolean;
  readonly maxScrollHeight?: number;
  readonly columns?: ColumnVirtualizationOptions;
}

export interface ColumnVirtualizationOptions {
  readonly enabled?: boolean;
  readonly overscan?: number | OverscanOptions;
  readonly maxDomColumns?: number;
}

export interface OverscanOptions {
  readonly before?: number;
  readonly after?: number;
  readonly rows?: number;
}

export interface ResolvedOverscan {
  readonly before: number;
  readonly after: number;
}

export type ScrollToRowAlign = "start" | "center" | "end" | "nearest";
export type ScrollToColumnAlign = ScrollToRowAlign;

export interface FixedRowVirtualWindow {
  readonly firstRow: number;
  readonly lastRow: number;
  readonly visibleFirstRow: number;
  readonly visibleLastRow: number;
  readonly rowHeight: number;
  readonly offsetTop: number;
  readonly beforeHeight: number;
  readonly afterHeight: number;
  readonly totalHeight: number;
  readonly renderedRowCount: number;
  readonly visibleRowCount: number;
  readonly overscanBefore: number;
  readonly overscanAfter: number;
  readonly scrollTop: number;
  readonly viewportHeight: number;
}

export interface FixedColumnVirtualWindow {
  readonly firstColumn: number;
  readonly lastColumn: number;
  readonly visibleFirstColumn: number;
  readonly visibleLastColumn: number;
  readonly offsetLeft: number;
  readonly beforeWidth: number;
  readonly afterWidth: number;
  readonly totalWidth: number;
  readonly renderedWidth: number;
  readonly renderedColumnCount: number;
  readonly visibleColumnCount: number;
  readonly overscanBefore: number;
  readonly overscanAfter: number;
  readonly scrollLeft: number;
  readonly viewportWidth: number;
}
