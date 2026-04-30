export type RowKey = string | number;

export type RowModelKind = "client" | "infinite" | "server" | "viewport" | "tree";

export type PinnedSide = "left" | "right";

export type SortDirection = "asc" | "desc";

export type SortCycleItem = SortDirection | null;

export type ScrollAlign = "start" | "center" | "end" | "nearest";

export type Density = "comfortable" | "standard" | "compact";

export type ColumnType = "text" | "number" | "date" | "datetime" | "boolean" | "custom";

export type FilterKind = "text" | "number" | "date" | "boolean" | "set" | "custom";

export type EditorKind =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "checkbox"
  | "select"
  | "multi-select"
  | "radio"
  | "textarea"
  | "autocomplete"
  | "custom";

export type EditBlurAction = "commit" | "cancel";

export type EditCommitMode = "cell" | "batch";

export type EditCommitTrigger = "enter" | "blur" | "api";

export type EditCancelReason = "escape" | "blur" | "api" | "replace";

export type SummaryKind = "sum" | "avg" | "min" | "max" | "count" | "distinct-count";

export type Unsubscribe = () => void;

export interface CellPosition {
  readonly rowIndex: number;
  readonly field: string;
  readonly rowKey?: RowKey;
}

export interface ViewportRange {
  readonly firstRow: number;
  readonly lastRow: number;
  readonly firstColumn?: number;
  readonly lastColumn?: number;
}

export interface SortModel {
  readonly field: string;
  readonly direction: SortDirection;
  readonly priority?: number;
}

export interface FilterCondition {
  readonly field: string;
  readonly kind: FilterKind;
  readonly operator: string;
  readonly value?: unknown;
}

export interface FilterModel {
  readonly conditions?: readonly FilterCondition[];
  readonly quickText?: string;
  readonly custom?: Readonly<Record<string, unknown>>;
}

export interface GroupModel {
  readonly fields?: readonly string[];
  readonly expandedKeys?: readonly string[];
}

export type GroupFooterPosition = "none" | "bottom";

export interface PivotModel {
  readonly rows: readonly string[];
  readonly columns: readonly string[];
  readonly values: readonly PivotValueModel[];
  readonly totals?: PivotTotalMode;
  readonly subtotals?: boolean;
}

export type PivotValueModel = string | PivotValueField;

export interface PivotValueField {
  readonly field: string;
  readonly function?: SummaryKind | string;
  readonly alias?: string;
  readonly label?: string;
}

export type PivotTotalMode = "none" | "rows" | "columns" | "both";

export interface AggregateModel {
  readonly fields: readonly AggregateField[];
}

export interface AggregateField {
  readonly field: string;
  readonly function: SummaryKind | string;
  readonly alias?: string;
}

export interface AggregateResult {
  readonly values: Readonly<Record<string, unknown>>;
}

export interface GroupMeta {
  readonly key: string;
  readonly field?: string;
  readonly value?: unknown;
  readonly level: number;
  readonly expanded?: boolean;
  readonly childCount?: number;
  readonly aggregateValues?: Readonly<Record<string, unknown>>;
  readonly footer?: boolean;
}

export interface MergeMeta {
  readonly anchor: CellPosition;
  readonly rowSpan: number;
  readonly colSpan: number;
  readonly value?: unknown;
}

export interface ValidationIssue {
  readonly field?: string;
  readonly rowKey?: RowKey;
  readonly message: string;
  readonly severity: "error" | "warning";
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

export interface GridExportResult {
  readonly content: string | Uint8Array;
  readonly mediaType: string;
  readonly filename?: string;
}

export interface CancellationSignal {
  readonly aborted: boolean;
  readonly reason?: unknown;
  throwIfAborted?(): void;
}

export interface HtmlSanitizer {
  sanitize(html: string): string;
}
