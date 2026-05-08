import type { CellContext, ColumnDef, ColumnTypeRegistry, DataColumnDefaults } from "./column.js";
import type { DataSource } from "./data.js";
import type { GridBeforeEventHandlers, GridEventHandlers } from "./events.js";
import type { GridPlugin } from "./plugin.js";
import type {
  AggregateModel,
  Density,
  EditBlurAction,
  EditCommitMode,
  EditStartMode,
  FilterModel,
  GroupFooterPosition,
  GroupModel,
  HtmlSanitizer,
  PivotModel,
  RowKey,
  RowModelKind,
  SortCycleItem,
  SortModel
} from "./shared.js";
import type { ColumnUiState } from "../column/columnUi.js";
import type { ContextMenuOptions } from "../menu/index.js";
import type { GridStateSnapshot } from "../state/gridState.js";
import type { VirtualizationOptions } from "../virtualization/index.js";

export interface GridOptions<TData = unknown> {
  readonly columns: readonly ColumnDef<TData>[];
  readonly defaultColumnDef?: DataColumnDefaults<TData>;
  readonly columnTypes?: ColumnTypeRegistry<TData>;
  readonly initialState?: GridStateSnapshot;
  readonly columnOrder?: readonly string[];
  readonly columnState?: ColumnUiState;
  readonly columnUi?: ColumnUiOptions;
  readonly headerMerge?: HeaderMergeOptions;
  readonly data?: readonly TData[];
  readonly dataSource?: DataSource<TData>;
  readonly rowModel?: RowModelKind;
  readonly infinite?: InfiniteRowOptions;
  readonly server?: ServerRowOptions;
  readonly viewport?: ViewportRowOptions;
  readonly rowKey?: string | ((row: TData, index: number) => RowKey);
  readonly width?: number | string;
  readonly height?: number | string;
  readonly bodyHeight?: number | string;
  readonly layout?: LayoutOptions;
  readonly virtualization?: VirtualizationOptions;
  readonly rowHeight?: number | "auto" | ((row: TData, index: number) => number);
  readonly headerHeight?: number | readonly number[];
  readonly frozenRows?: FrozenRowOptions;
  readonly frozenColumns?: FrozenColumnOptions;
  readonly selection?: SelectionOptions;
  readonly editing?: EditingOptions;
  readonly filtering?: FilteringOptions;
  readonly sorting?: SortingOptions;
  readonly grouping?: GroupingOptions;
  readonly aggregation?: AggregationOptions;
  readonly pivot?: PivotOptions;
  readonly summary?: SummaryOptions;
  readonly tree?: TreeOptions;
  readonly merge?: MergeOptions<TData>;
  readonly pagination?: PaginationOptions;
  readonly clipboard?: ClipboardOptions;
  readonly export?: ExportOptions;
  readonly import?: ImportOptions<TData>;
  readonly contextMenu?: ContextMenuOptions<TData>;
  readonly accessibility?: AccessibilityOptions;
  readonly security?: SecurityOptions;
  readonly theme?: ThemeOptions;
  readonly locale?: string;
  readonly plugins?: readonly GridPlugin<TData>[];
  readonly events?: GridEventHandlers<TData>;
  readonly beforeEvents?: GridBeforeEventHandlers<TData>;
}

export interface HeaderMergeOptions {
  readonly enabled?: boolean;
  readonly rules?: readonly HeaderMergeRule[];
}

export interface HeaderMergeRule {
  readonly id?: string;
  readonly headerName: string;
  readonly columnIds: readonly string[];
  readonly presentation?: "row" | "label";
  readonly ariaLabel?: string;
}

export interface ColumnUiOptions {
  readonly resize?: boolean;
  readonly autoSize?: boolean;
  readonly reorder?: boolean;
  readonly menu?: boolean;
  readonly toolPanel?: boolean;
}

export interface FrozenRowOptions {
  readonly top?: number;
  readonly bottom?: number;
}

export interface InfiniteRowOptions {
  readonly blockSize?: number;
  readonly maxBlocksInCache?: number;
  readonly initialRowCount?: number;
}

export interface ServerRowOptions {
  readonly pageSize?: number;
  readonly initialPage?: number;
  readonly groupKeys?: readonly string[];
  readonly snapshotVersion?: string;
}

export interface ViewportRowOptions {
  readonly rowHeight?: number;
  readonly viewportSize?: number;
  readonly overscan?: number;
  readonly prefetchRows?: number;
  readonly highVelocityRowsPerSecond?: number;
  readonly maxCachedRanges?: number;
  readonly initialRowCount?: number;
  readonly snapshotVersion?: string;
}

export interface FrozenColumnOptions {
  readonly left?: readonly string[];
  readonly right?: readonly string[];
}

export interface LayoutOptions {
  readonly width?: number | string;
  readonly height?: number | string;
  readonly bodyHeight?: number | string;
  readonly minBodyHeight?: number | string;
}

export interface SelectionOptions {
  readonly mode?: "none" | "row" | "cell" | "range";
  readonly multiple?: boolean;
  readonly checkbox?: boolean;
  readonly selectAll?: "none" | "visible" | "server";
  readonly serverSelectionToken?: string;
}

export interface EditingOptions {
  readonly enabled?: boolean;
  readonly startMode?: EditStartMode;
  readonly commitMode?: EditCommitMode;
  readonly readOnly?: boolean;
  readonly keyboard?: EditingKeyboardOptions;
  readonly undoRedo?: boolean | EditUndoRedoOptions;
  readonly blurAction?: EditBlurAction;
  readonly commitOnBlur?: boolean;
  readonly validateOnCommit?: boolean;
}

export interface EditUndoRedoOptions {
  readonly enabled?: boolean;
  readonly limit?: number;
}

export interface EditingKeyboardOptions {
  readonly startOnEnter?: boolean;
  readonly commitOnEnter?: boolean;
  readonly moveOnTab?: boolean;
  readonly commitOnTab?: boolean;
  readonly cancelOnEscape?: boolean;
  readonly clearOnBackspace?: boolean;
}

export interface FilteringOptions {
  readonly enabled?: boolean;
  readonly serverOnly?: boolean;
  readonly quickFilter?: boolean;
  readonly model?: FilterModel;
}

export interface SortingOptions {
  readonly enabled?: boolean;
  readonly multiSort?: boolean;
  readonly serverOnly?: boolean;
  readonly sortOrder?: readonly SortCycleItem[];
  readonly model?: readonly SortModel[];
}

export interface GroupingOptions {
  readonly enabled?: boolean;
  readonly serverOnly?: boolean;
  readonly model?: GroupModel;
  readonly footer?: GroupFooterPosition;
}

export interface AggregationOptions {
  readonly enabled?: boolean;
  readonly serverOnly?: boolean;
  readonly model?: AggregateModel;
}

export interface PivotOptions {
  readonly enabled?: boolean;
  readonly serverOnly?: boolean;
  readonly panel?: boolean;
  readonly model?: PivotModel;
}

export interface SummaryOptions {
  readonly enabled?: boolean;
  readonly position?: "top" | "bottom" | "both";
  readonly sticky?: boolean;
}

export interface TreeOptions {
  readonly enabled?: boolean;
  readonly treeColumnField?: string;
  readonly childrenField?: string;
  readonly hasChildrenField?: string;
  readonly lazy?: boolean;
  readonly indentSize?: number;
  readonly expandedKeys?: readonly RowKey[];
  readonly filterPolicy?: "strict" | "withAncestors" | "withDescendants" | "withAncestorsAndDescendants";
  readonly sortPolicy?: "none" | "siblings";
  readonly selection?: TreeSelectionOptions;
  readonly serverOnly?: boolean;
}

export interface TreeSelectionOptions {
  readonly policy?: "self" | "descendants";
  readonly selectedKeys?: readonly RowKey[];
}

export interface MergeOptions<TData = unknown> {
  readonly enabled?: boolean;
  readonly strategy?: "value" | "custom" | "server";
  readonly fields?: readonly string[];
  readonly columnIds?: readonly string[];
  readonly getSpan?: (context: CellContext<TData>) => MergeSpan | undefined;
}

export interface MergeSpan {
  readonly rowSpan: number;
  readonly colSpan: number;
}

export interface PaginationOptions {
  readonly mode?: "client" | "server" | "cursor" | "append-scroll" | "infinite" | "viewport";
  readonly position?: "top" | "bottom" | "both";
  readonly page?: number;
  readonly pageSize?: number;
  readonly pageSizeOptions?: readonly number[];
  readonly pageGroupSize?: number;
  readonly cursor?: string;
}

export interface ClipboardOptions {
  readonly enabled?: boolean;
  readonly includeHeaders?: boolean;
  readonly preserveMerge?: boolean;
}

export interface ExportOptions {
  readonly format?: "csv" | "xlsx" | "pdf" | "json" | "print" | (string & {});
  readonly selectedOnly?: boolean;
  readonly includeHeaders?: boolean;
  readonly preserveVisualLayout?: boolean;
  readonly filename?: string;
  readonly sheetName?: string;
  readonly title?: string;
  readonly includeHeaderMerges?: boolean;
  readonly includeCellMerges?: boolean;
}

export interface ImportOptions<TData = unknown> {
  readonly format?: "csv" | "xlsx" | "json";
  readonly mode?: "replace" | "append";
  readonly hasHeaders?: boolean;
  readonly headerRowCount?: number;
  readonly columns?: readonly string[];
  parseRow?(record: Readonly<Record<string, unknown>>, rowIndex: number): TData;
}

export interface SecurityOptions {
  readonly csp?: {
    readonly nonce?: string;
    readonly disableStyleInjection?: boolean;
  };
  readonly html?: {
    readonly allowHtmlRenderer?: boolean;
    readonly sanitizer?: HtmlSanitizer;
    readonly trustedTypesPolicyName?: string;
  };
  readonly url?: {
    readonly allowedProtocols?: readonly string[];
  };
}

export interface AccessibilityOptions {
  readonly label?: string;
  readonly description?: string;
  readonly liveRegion?: "off" | "polite" | "assertive";
}

export interface ThemeOptions {
  readonly name?: string;
  readonly density?: Density;
  readonly className?: string;
  readonly variables?: Readonly<Record<string, string>>;
}

export interface ThemeExtensionPayload {
  readonly theme: ThemeOptions;
}

export type ThemeInput = string | ThemeOptions;
