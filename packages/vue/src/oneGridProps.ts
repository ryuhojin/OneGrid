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
  DataColumnDefaults,
  EditingOptions,
  ExportOptions,
  FilteringOptions,
  FrozenColumnOptions,
  FrozenRowOptions,
  GridBeforeEventHandlers,
  GridOptions,
  GridEventHandlers,
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
  VirtualizationOptions,
  ViewportRowOptions
} from "@onegrid/core";
import type { PropType } from "vue";

export const oneGridProps = {
  columns: {
    type: Array as PropType<readonly ColumnDef<unknown>[]>,
    required: true
  },
  defaultColumnDef: {
    type: Object as PropType<DataColumnDefaults<unknown> | undefined>,
    default: undefined
  },
  columnTypes: {
    type: Object as PropType<ColumnTypeRegistry<unknown> | undefined>,
    default: undefined
  },
  initialState: {
    type: Object as PropType<GridStateSnapshot | undefined>,
    default: undefined
  },
  columnOrder: {
    type: Array as PropType<readonly string[] | undefined>,
    default: undefined
  },
  columnState: {
    type: Object as PropType<ColumnUiState | undefined>,
    default: undefined
  },
  columnUi: {
    type: Object as PropType<ColumnUiOptions | undefined>,
    default: undefined
  },
  headerMerge: {
    type: Object as PropType<HeaderMergeOptions | undefined>,
    default: undefined
  },
  data: {
    type: Array as PropType<readonly unknown[] | undefined>,
    default: undefined
  },
  dataSource: {
    type: Object as PropType<DataSource<unknown> | undefined>,
    default: undefined
  },
  rowKey: {
    type: [String, Function] as PropType<
      string | ((row: unknown, index: number) => RowKey) | undefined
    >,
    default: undefined
  },
  rowModel: {
    type: String as PropType<RowModelKind | undefined>,
    default: undefined
  },
  rowHeight: {
    type: [Number, String, Function] as PropType<
      NonNullable<GridOptions<unknown>["rowHeight"]> | undefined
    >,
    default: undefined
  },
  width: {
    type: [Number, String] as PropType<NonNullable<GridOptions<unknown>["width"]> | undefined>,
    default: undefined
  },
  height: {
    type: [Number, String] as PropType<NonNullable<GridOptions<unknown>["height"]> | undefined>,
    default: undefined
  },
  bodyHeight: {
    type: [Number, String] as PropType<NonNullable<GridOptions<unknown>["bodyHeight"]> | undefined>,
    default: undefined
  },
  headerHeight: {
    type: [Number, Array] as PropType<
      NonNullable<GridOptions<unknown>["headerHeight"]> | undefined
    >,
    default: undefined
  },
  infinite: {
    type: Object as PropType<InfiniteRowOptions | undefined>,
    default: undefined
  },
  server: {
    type: Object as PropType<ServerRowOptions | undefined>,
    default: undefined
  },
  viewport: {
    type: Object as PropType<ViewportRowOptions | undefined>,
    default: undefined
  },
  tree: {
    type: Object as PropType<TreeOptions | undefined>,
    default: undefined
  },
  layout: {
    type: Object as PropType<LayoutOptions | undefined>,
    default: undefined
  },
  virtualization: {
    type: Object as PropType<VirtualizationOptions | undefined>,
    default: undefined
  },
  frozenRows: {
    type: Object as PropType<FrozenRowOptions | undefined>,
    default: undefined
  },
  frozenColumns: {
    type: Object as PropType<FrozenColumnOptions | undefined>,
    default: undefined
  },
  filtering: {
    type: Object as PropType<FilteringOptions | undefined>,
    default: undefined
  },
  editing: {
    type: Object as PropType<EditingOptions | undefined>,
    default: undefined
  },
  clipboard: {
    type: Object as PropType<ClipboardOptions | undefined>,
    default: undefined
  },
  export: {
    type: Object as PropType<ExportOptions | undefined>,
    default: undefined
  },
  import: {
    type: Object as PropType<ImportOptions<unknown> | undefined>,
    default: undefined
  },
  contextMenu: {
    type: Object as PropType<ContextMenuOptions<unknown> | undefined>,
    default: undefined
  },
  sorting: {
    type: Object as PropType<SortingOptions | undefined>,
    default: undefined
  },
  selection: {
    type: Object as PropType<SelectionOptions | undefined>,
    default: undefined
  },
  grouping: {
    type: Object as PropType<GroupingOptions | undefined>,
    default: undefined
  },
  aggregation: {
    type: Object as PropType<AggregationOptions | undefined>,
    default: undefined
  },
  pivot: {
    type: Object as PropType<PivotOptions | undefined>,
    default: undefined
  },
  summary: {
    type: Object as PropType<SummaryOptions | undefined>,
    default: undefined
  },
  merge: {
    type: Object as PropType<MergeOptions<unknown> | undefined>,
    default: undefined
  },
  pagination: {
    type: Object as PropType<PaginationOptions | undefined>,
    default: undefined
  },
  security: {
    type: Object as PropType<SecurityOptions | undefined>,
    default: undefined
  },
  accessibility: {
    type: Object as PropType<AccessibilityOptions | undefined>,
    default: undefined
  },
  locale: {
    type: String as PropType<string | undefined>,
    default: undefined
  },
  theme: {
    type: Object as PropType<ThemeOptions | undefined>,
    default: undefined
  },
  events: {
    type: Object as PropType<GridEventHandlers<unknown> | undefined>,
    default: undefined
  },
  beforeEvents: {
    type: Object as PropType<GridBeforeEventHandlers<unknown> | undefined>,
    default: undefined
  },
  plugins: {
    type: Array as PropType<readonly GridPlugin<unknown>[] | undefined>,
    default: undefined
  }
} as const;
