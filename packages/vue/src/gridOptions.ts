import type {
  AccessibilityOptions,
  AggregationOptions,
  ClipboardOptions,
  ColumnDef,
  ColumnTypeRegistry,
  ColumnUiOptions,
  ColumnUiState,
  ContextMenuOptions,
  DataSource,
  EditingOptions,
  ExportOptions,
  FilteringOptions,
  FrozenColumnOptions,
  FrozenRowOptions,
  GridBeforeEventHandlers,
  GridEventHandlers,
  GridOptions,
  GridPlugin,
  GridStateSnapshot,
  GroupingOptions,
  HeaderMergeOptions,
  ImportOptions,
  InfiniteRowOptions,
  LayoutOptions,
  MergeOptions,
  PaginationOptions,
  PivotOptions,
  RowKey,
  RowModelKind,
  SecurityOptions,
  SelectionOptions,
  ServerRowOptions,
  SortingOptions,
  SummaryOptions,
  ThemeOptions,
  TreeOptions,
  DataColumnDefaults,
  VirtualizationOptions,
  ViewportRowOptions
} from "@onegrid/core";
import { createVueGridBeforeEventHandlers, createVueGridEventHandlers } from "./vueEvents.js";
import type { VueGridBeforeEmit, VueGridEmit } from "./vueEvents.js";
import type { VueRendererBridge } from "./vueRendererBridge.js";

export interface OneGridProps {
  readonly columns: readonly ColumnDef<unknown>[];
  readonly defaultColumnDef?: DataColumnDefaults<unknown> | undefined;
  readonly columnTypes?: ColumnTypeRegistry<unknown> | undefined;
  readonly initialState?: GridStateSnapshot | undefined;
  readonly columnOrder?: readonly string[] | undefined;
  readonly columnState?: ColumnUiState | undefined;
  readonly columnUi?: ColumnUiOptions | undefined;
  readonly headerMerge?: HeaderMergeOptions | undefined;
  readonly data?: readonly unknown[] | undefined;
  readonly dataSource?: DataSource<unknown> | undefined;
  readonly rowKey?: string | ((row: unknown, index: number) => RowKey) | undefined;
  readonly rowModel?: RowModelKind | undefined;
  readonly rowHeight?: NonNullable<GridOptions<unknown>["rowHeight"]> | undefined;
  readonly width?: NonNullable<GridOptions<unknown>["width"]> | undefined;
  readonly height?: NonNullable<GridOptions<unknown>["height"]> | undefined;
  readonly bodyHeight?: NonNullable<GridOptions<unknown>["bodyHeight"]> | undefined;
  readonly headerHeight?: NonNullable<GridOptions<unknown>["headerHeight"]> | undefined;
  readonly infinite?: InfiniteRowOptions | undefined;
  readonly server?: ServerRowOptions | undefined;
  readonly viewport?: ViewportRowOptions | undefined;
  readonly tree?: TreeOptions | undefined;
  readonly layout?: LayoutOptions | undefined;
  readonly virtualization?: VirtualizationOptions | undefined;
  readonly frozenRows?: FrozenRowOptions | undefined;
  readonly frozenColumns?: FrozenColumnOptions | undefined;
  readonly editing?: EditingOptions | undefined;
  readonly clipboard?: ClipboardOptions | undefined;
  readonly export?: ExportOptions | undefined;
  readonly import?: ImportOptions<unknown> | undefined;
  readonly contextMenu?: ContextMenuOptions<unknown> | undefined;
  readonly filtering?: FilteringOptions | undefined;
  readonly sorting?: SortingOptions | undefined;
  readonly selection?: SelectionOptions | undefined;
  readonly grouping?: GroupingOptions | undefined;
  readonly aggregation?: AggregationOptions | undefined;
  readonly pivot?: PivotOptions | undefined;
  readonly summary?: SummaryOptions | undefined;
  readonly merge?: MergeOptions<unknown> | undefined;
  readonly pagination?: PaginationOptions | undefined;
  readonly accessibility?: AccessibilityOptions | undefined;
  readonly security?: SecurityOptions | undefined;
  readonly locale?: string | undefined;
  readonly theme?: ThemeOptions | undefined;
  readonly events?: GridEventHandlers<unknown> | undefined;
  readonly beforeEvents?: GridBeforeEventHandlers<unknown> | undefined;
  readonly plugins?: readonly GridPlugin<unknown>[] | undefined;
}

export function toGridOptions(
  props: OneGridProps,
  bridge?: VueRendererBridge<unknown>,
  emit?: VueGridEmit<unknown>,
  beforeEmit?: VueGridBeforeEmit<unknown>
): GridOptions<unknown> {
  const events = createVueGridEventHandlers(props.events, emit);
  const beforeEvents = createVueGridBeforeEventHandlers(props.beforeEvents, beforeEmit);
  const options: {
    columns: readonly ColumnDef<unknown>[];
    defaultColumnDef?: DataColumnDefaults<unknown>;
    columnTypes?: ColumnTypeRegistry<unknown>;
    initialState?: GridStateSnapshot;
    columnOrder?: readonly string[];
    columnState?: ColumnUiState;
    columnUi?: ColumnUiOptions;
    headerMerge?: HeaderMergeOptions;
    data?: readonly unknown[];
    dataSource?: DataSource<unknown>;
    rowKey?: string | ((row: unknown, index: number) => RowKey);
    rowModel?: RowModelKind;
    rowHeight?: NonNullable<GridOptions<unknown>["rowHeight"]>;
    width?: NonNullable<GridOptions<unknown>["width"]>;
    height?: NonNullable<GridOptions<unknown>["height"]>;
    bodyHeight?: NonNullable<GridOptions<unknown>["bodyHeight"]>;
    headerHeight?: NonNullable<GridOptions<unknown>["headerHeight"]>;
    infinite?: InfiniteRowOptions;
    server?: ServerRowOptions;
    viewport?: ViewportRowOptions;
    tree?: TreeOptions;
    layout?: LayoutOptions;
    virtualization?: VirtualizationOptions;
    frozenRows?: FrozenRowOptions;
    frozenColumns?: FrozenColumnOptions;
    editing?: EditingOptions;
    clipboard?: ClipboardOptions;
    export?: ExportOptions;
    import?: ImportOptions<unknown>;
    contextMenu?: ContextMenuOptions<unknown>;
    filtering?: FilteringOptions;
    sorting?: SortingOptions;
    selection?: SelectionOptions;
    grouping?: GroupingOptions;
    aggregation?: AggregationOptions;
    pivot?: PivotOptions;
    summary?: SummaryOptions;
    merge?: MergeOptions<unknown>;
    pagination?: PaginationOptions;
    accessibility?: AccessibilityOptions;
    security?: SecurityOptions;
    locale?: string;
    theme?: ThemeOptions;
    events?: GridEventHandlers<unknown>;
    beforeEvents?: GridBeforeEventHandlers<unknown>;
    plugins?: readonly GridPlugin<unknown>[];
  } = { columns: bridge?.enhanceColumns(props.columns) ?? props.columns };

  if (props.defaultColumnDef !== undefined) {
    options.defaultColumnDef = props.defaultColumnDef;
  }
  if (props.columnTypes !== undefined) {
    options.columnTypes = props.columnTypes;
  }
  if (props.initialState !== undefined) {
    options.initialState = props.initialState;
  }
  if (props.columnOrder !== undefined) {
    options.columnOrder = props.columnOrder;
  }
  if (props.columnState !== undefined) {
    options.columnState = props.columnState;
  }
  if (props.columnUi !== undefined) {
    options.columnUi = props.columnUi;
  }
  if (props.headerMerge !== undefined) {
    options.headerMerge = props.headerMerge;
  }
  if (props.data !== undefined) {
    options.data = props.data;
  }
  if (props.dataSource !== undefined) {
    options.dataSource = props.dataSource;
  }
  if (props.rowKey !== undefined) {
    options.rowKey = props.rowKey;
  }
  if (props.rowModel !== undefined) {
    options.rowModel = props.rowModel;
  }
  if (props.rowHeight !== undefined) {
    options.rowHeight = props.rowHeight;
  }
  if (props.width !== undefined) {
    options.width = props.width;
  }
  if (props.height !== undefined) {
    options.height = props.height;
  }
  if (props.bodyHeight !== undefined) {
    options.bodyHeight = props.bodyHeight;
  }
  if (props.headerHeight !== undefined) {
    options.headerHeight = props.headerHeight;
  }
  if (props.infinite !== undefined) {
    options.infinite = props.infinite;
  }
  if (props.server !== undefined) {
    options.server = props.server;
  }
  if (props.viewport !== undefined) {
    options.viewport = props.viewport;
  }
  if (props.tree !== undefined) {
    options.tree = props.tree;
  }
  if (props.layout !== undefined) {
    options.layout = props.layout;
  }
  if (props.virtualization !== undefined) {
    options.virtualization = props.virtualization;
  }
  if (props.frozenRows !== undefined) {
    options.frozenRows = props.frozenRows;
  }
  if (props.frozenColumns !== undefined) {
    options.frozenColumns = props.frozenColumns;
  }
  if (props.editing !== undefined) {
    options.editing = props.editing;
  }
  if (props.clipboard !== undefined) {
    options.clipboard = props.clipboard;
  }
  if (props.export !== undefined) {
    options.export = props.export;
  }
  if (props.import !== undefined) {
    options.import = props.import;
  }
  if (props.contextMenu !== undefined) {
    options.contextMenu = props.contextMenu;
  }
  if (props.filtering !== undefined) {
    options.filtering = props.filtering;
  }
  if (props.sorting !== undefined) {
    options.sorting = props.sorting;
  }
  if (props.selection !== undefined) {
    options.selection = props.selection;
  }
  if (props.grouping !== undefined) {
    options.grouping = props.grouping;
  }
  if (props.aggregation !== undefined) {
    options.aggregation = props.aggregation;
  }
  if (props.pivot !== undefined) {
    options.pivot = props.pivot;
  }
  if (props.summary !== undefined) {
    options.summary = props.summary;
  }
  if (props.merge !== undefined) {
    options.merge = props.merge;
  }
  if (props.pagination !== undefined) {
    options.pagination = props.pagination;
  }
  if (props.accessibility !== undefined) {
    options.accessibility = props.accessibility;
  }
  if (props.security !== undefined) {
    options.security = props.security;
  }
  if (props.locale !== undefined) {
    options.locale = props.locale;
  }
  if (props.theme !== undefined) {
    options.theme = props.theme;
  }
  if (events !== undefined) {
    options.events = events;
  }
  if (beforeEvents !== undefined) {
    options.beforeEvents = beforeEvents;
  }
  if (props.plugins !== undefined) {
    options.plugins = props.plugins;
  }

  return options;
}
