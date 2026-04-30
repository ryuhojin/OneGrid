import type {
  AccessibilityOptions,
  AggregationOptions,
  ClipboardOptions,
  ColumnDef,
  ColumnUiOptions,
  ColumnUiState,
  ContextMenuOptions,
  DataSource,
  EditingOptions,
  FilteringOptions,
  GridOptions,
  GroupingOptions,
  HeaderMergeOptions,
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
  TreeOptions,
  VirtualizationOptions,
  ViewportRowOptions
} from "@onegrid/core";

export interface OneGridProps {
  readonly columns: readonly ColumnDef<unknown>[];
  readonly columnOrder?: readonly string[] | undefined;
  readonly columnState?: ColumnUiState | undefined;
  readonly columnUi?: ColumnUiOptions | undefined;
  readonly headerMerge?: HeaderMergeOptions | undefined;
  readonly data?: readonly unknown[] | undefined;
  readonly dataSource?: DataSource<unknown> | undefined;
  readonly rowKey?: string | ((row: unknown, index: number) => RowKey) | undefined;
  readonly rowModel?: RowModelKind | undefined;
  readonly rowHeight?: NonNullable<GridOptions<unknown>["rowHeight"]> | undefined;
  readonly infinite?: InfiniteRowOptions | undefined;
  readonly server?: ServerRowOptions | undefined;
  readonly viewport?: ViewportRowOptions | undefined;
  readonly tree?: TreeOptions | undefined;
  readonly layout?: LayoutOptions | undefined;
  readonly virtualization?: VirtualizationOptions | undefined;
  readonly editing?: EditingOptions | undefined;
  readonly clipboard?: ClipboardOptions | undefined;
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
}

export function toGridOptions(props: OneGridProps): GridOptions<unknown> {
  const options: {
    columns: readonly ColumnDef<unknown>[];
    columnOrder?: readonly string[];
    columnState?: ColumnUiState;
    columnUi?: ColumnUiOptions;
    headerMerge?: HeaderMergeOptions;
    data?: readonly unknown[];
    dataSource?: DataSource<unknown>;
    rowKey?: string | ((row: unknown, index: number) => RowKey);
    rowModel?: RowModelKind;
    rowHeight?: NonNullable<GridOptions<unknown>["rowHeight"]>;
    infinite?: InfiniteRowOptions;
    server?: ServerRowOptions;
    viewport?: ViewportRowOptions;
    tree?: TreeOptions;
    layout?: LayoutOptions;
    virtualization?: VirtualizationOptions;
    editing?: EditingOptions;
    clipboard?: ClipboardOptions;
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
  } = { columns: props.columns };

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
  if (props.editing !== undefined) {
    options.editing = props.editing;
  }
  if (props.clipboard !== undefined) {
    options.clipboard = props.clipboard;
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

  return options;
}
