import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PropType } from "vue";
import type {
  AccessibilityOptions,
  AggregationOptions,
  CellPosition,
  ClipboardCopyOptions,
  ClipboardOptions,
  ColumnDef,
  ColumnUiOptions,
  ColumnUiState,
  CommitPendingEditsOptions,
  ContextMenuOptions,
  DataSource,
  EditingOptions,
  ExportOptions,
  FilteringOptions,
  FrozenColumnOptions,
  FrozenRowOptions,
  GridOptions,
  GridExportResult,
  GridImportResult,
  GridPendingEdit,
  GridSelectionState,
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
  ScrollAlign,
  SecurityOptions,
  SelectedCell,
  SelectionOptions,
  ServerRowOptions,
  SortingOptions,
  StopEditOptions,
  SummaryOptions,
  TreeOptions,
  VirtualizationOptions,
  ViewportRowOptions
} from "@onegrid/core";
import { OneGrid as DomOneGrid } from "@onegrid/dom";
import { toGridOptions } from "./gridOptions.js";

export const OneGrid = defineComponent({
  name: "OneGrid",
  props: {
    columns: {
      type: Array as PropType<readonly ColumnDef<unknown>[]>,
      required: true
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
    }
  },
  setup(props, { expose }) {
    const host = ref<HTMLElement | null>(null);
    let grid: DomOneGrid<unknown> | undefined;

    const mount = (): void => {
      if (!host.value) {
        return;
      }

      grid?.destroy();
      grid = new DomOneGrid<unknown>({
        ...toGridOptions(props),
        el: host.value
      });
    };

    onMounted(mount);
    onBeforeUnmount(() => {
      grid?.destroy();
      grid = undefined;
    });
    watch(
      () => [
        props.columns,
        props.columnOrder,
        props.columnState,
        props.columnUi,
        props.headerMerge,
        props.data,
        props.dataSource,
        props.rowKey,
        props.rowModel,
        props.rowHeight,
        props.infinite,
        props.server,
        props.viewport,
        props.tree,
        props.layout,
        props.virtualization,
        props.frozenRows,
        props.frozenColumns,
        props.editing,
        props.clipboard,
        props.export,
        props.import,
        props.contextMenu,
        props.filtering,
        props.sorting,
        props.selection,
        props.grouping,
        props.aggregation,
        props.pivot,
        props.summary,
        props.merge,
        props.pagination,
        props.accessibility,
        props.security
      ],
      mount,
      { deep: true }
    );

    expose({
      destroy() {
        grid?.destroy();
      },
      scrollToRow(rowIndex: number, align?: ScrollAlign) {
        return grid?.scrollToRow(rowIndex, align);
      },
      scrollToColumn(field: string, align?: ScrollAlign) {
        return grid?.scrollToColumn(field, align);
      },
      startEdit(position: CellPosition) {
        grid?.startEdit(position);
      },
      stopEdit(options?: StopEditOptions) {
        grid?.stopEdit(options);
      },
      getPendingEdits(): readonly GridPendingEdit[] {
        return grid?.getPendingEdits() ?? [];
      },
      commitPendingEdits(options?: CommitPendingEditsOptions) {
        return grid?.commitPendingEdits(options) ?? Promise.resolve();
      },
      cancelPendingEdits() {
        grid?.cancelPendingEdits();
      },
      copyToClipboard(options?: ClipboardCopyOptions) {
        return grid?.copyToClipboard(options) ?? Promise.resolve();
      },
      pasteFromClipboard(text: string) {
        return grid?.pasteFromClipboard(text) ?? Promise.resolve();
      },
      exportData(options?: ExportOptions): Promise<GridExportResult> {
        return grid?.exportData(options)
          ?? Promise.resolve({ content: "", mediaType: "text/plain" });
      },
      importData(
        content: string | Uint8Array,
        options?: ImportOptions<unknown>
      ): Promise<GridImportResult<unknown>> {
        return grid?.importData(content, options)
          ?? Promise.resolve({ rows: [], rowCount: 0, rejected: [] });
      },
      setGroupModel(model: GroupingOptions["model"]) {
        if (model) {
          grid?.setGroupModel(model);
        }
      },
      getGroupModel(): GroupingOptions["model"] {
        return grid?.getGroupModel();
      },
      expandGroup(groupKey: string) {
        grid?.expandGroup(groupKey);
      },
      collapseGroup(groupKey: string) {
        grid?.collapseGroup(groupKey);
      },
      toggleGroup(groupKey: string) {
        grid?.toggleGroup(groupKey);
      },
      expandTreeNode(rowKey: RowKey) {
        return grid?.expandTreeNode(rowKey) ?? Promise.resolve();
      },
      collapseTreeNode(rowKey: RowKey) {
        grid?.collapseTreeNode(rowKey);
      },
      toggleTreeNode(rowKey: RowKey) {
        return grid?.toggleTreeNode(rowKey) ?? Promise.resolve();
      },
      selectTreeNode(rowKey: RowKey, selected: boolean) {
        grid?.selectTreeNode(rowKey, selected);
      },
      getTreeSelection(): readonly RowKey[] {
        return grid?.getTreeSelection() ?? [];
      },
      getSelectionState(): GridSelectionState | undefined {
        return grid?.getSelectionState();
      },
      getSelectedRows(): readonly unknown[] {
        return grid?.getSelectedRows() ?? [];
      },
      selectRows(rowKeys: readonly RowKey[]) {
        grid?.selectRows(rowKeys);
      },
      selectCell(cell: SelectedCell) {
        grid?.selectCell(cell);
      },
      selectCellRange(anchor: SelectedCell, focus: SelectedCell) {
        grid?.selectCellRange(anchor, focus);
      },
      selectAllVisibleRows() {
        grid?.selectAllVisibleRows();
      },
      selectServerDataset() {
        grid?.selectServerDataset();
      },
      clearSelection() {
        grid?.clearSelection();
      },
      setPage(page: number) {
        grid?.setPage(page);
      },
      getPage(): number | undefined {
        return grid?.getPage();
      },
      setPageSize(pageSize: number) {
        grid?.setPageSize(pageSize);
      },
      getPageSize(): number | undefined {
        return grid?.getPageSize();
      }
    });

    return () => h("div", { ref: host, class: "og-vue-host" });
  }
});
