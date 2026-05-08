import { describe, expect, expectTypeOf, it } from "vitest";
import { getLocale } from "../src/index.js";
import type {
  ColumnDef,
  ColumnId,
  ColumnKey,
  ColumnMenuExtensionPayload,
  ColumnTypeRegistry,
  ColumnUiState,
  ContextMenuExtensionPayload,
  DataColumnDefaults,
  DataSource,
  ExportOptions,
  GetRowsRequest,
  GridApi,
  GridBatchEditSession,
  GridBeforeEventHandlers,
  GridEditHistoryState,
  GridCellEditRequestedEvent,
  GridExportAdapterPayload,
  GridOptions,
  GridPendingEdit,
  GridPlugin,
  GridPluginExtension,
  GridPluginExtensionContribution,
  GridStateSnapshot,
  ImportOptions,
  LocaleDefinition,
  RowKey,
  StartBatchEditSessionOptions,
  ThemeExtensionPayload,
  VirtualizationOptions
} from "../src/index.js";

interface OrderRow {
  readonly id: string;
  readonly amount: number;
  readonly status: "draft" | "approved";
}

describe("@onegrid/core public type skeleton", () => {
  it("models server data requests without DOM dependencies", async () => {
    const request: GetRowsRequest = {
      rowModel: "server",
      startRow: 0,
      endRow: 100,
      sortModel: [{ field: "amount", direction: "desc" }],
      filterModel: {
        conditions: [
          {
            columnId: "status",
            field: "status",
            kind: "set",
            operator: "in",
            value: ["approved"]
          }
        ]
      },
      groupModel: { fields: [] },
      groupKeys: [],
      requestId: "request-1"
    };

    const dataSource: DataSource<OrderRow> = {
      async getRows(receivedRequest) {
        expect(receivedRequest).toEqual(request);
        return {
          rows: [{ id: "A-001", amount: 10_000, status: "approved" }],
          rowCount: 1
        };
      }
    };

    await expect(dataSource.getRows(request)).resolves.toMatchObject({ rowCount: 1 });
  });

  it("keeps options, columns, and plugins strongly typed", () => {
    const columns: readonly ColumnDef<OrderRow>[] = [
      { columnId: "order-id", field: "id", headerName: "ID", pinned: "left" },
      { field: "amount", headerName: "Amount", type: "money", summary: "sum" },
      { field: "status", headerName: "Status", editable: true, editTrigger: "singleClick" },
      {
        columnId: "row-actions",
        headerName: "Actions",
        renderer: { kind: "text", render: () => "Open" }
      },
      {
        columnId: "workflow-group",
        groupId: "workflow",
        headerName: "Workflow",
        children: [
          {
            columnId: "grouped-status",
            field: "status",
            headerName: "Grouped Status",
            filter: "set"
          }
        ]
      }
    ];
    const amountColumnId: ColumnId = "amount";
    const amountColumnKey: ColumnKey = amountColumnId;

    const plugin: GridPlugin<OrderRow> = {
      id: "audit",
      setup(context) {
        const extension: GridPluginExtensionContribution<{ label: string }> = {
          id: "audit-menu",
          point: "menu.context",
          payload: { label: "Audit" }
        };
        context.registerExtension(extension);
        context.registerExtension<ColumnMenuExtensionPayload<OrderRow>>({
          id: "audit-header",
          point: "menu.header",
          payload: { label: "Audit header" }
        });
        context.registerExtension<ContextMenuExtensionPayload<OrderRow>>({
          id: "audit-context",
          point: "menu.context",
          payload: { item: { id: "audit-row", label: "Audit row" } }
        });
        context.registerExtension<GridExportAdapterPayload<OrderRow>>({
          id: "audit-export",
          point: "export.adapter",
          payload: {
            format: "audit-json",
            export({ matrix }) {
              return {
                content: JSON.stringify(matrix.columns.map((column) => column.id)),
                mediaType: "application/json"
              };
            }
          }
        });
        context.registerExtension<ThemeExtensionPayload>({
          id: "audit-theme",
          point: "theme",
          payload: { theme: { variables: { "--og-color-focus-ring": "#d7191f" } } }
        });
        expectTypeOf(context.getExtensions<{ label: string }>("menu.context"))
          .toMatchTypeOf<readonly GridPluginExtension<{ label: string }>[]>();
        return undefined;
      }
    };
    const locale: LocaleDefinition = {
      locale: "en-AU",
      text: {
        ...getLocale("en-US").text,
        footerRows: (rowCount, formatNumber) => `Rows: ${formatNumber(rowCount)}`
      }
    };

    const options: GridOptions<OrderRow> = {
      columns,
      defaultColumnDef: {
        minWidth: 96,
        resizable: true,
        filter: "text"
      },
      columnTypes: {
        money: {
          type: "number",
          width: 140,
          filter: "number",
          editor: "number"
        }
      },
      rowModel: "server",
      filtering: {
        model: { quickText: "approved" }
      },
      sorting: {
        model: [{ columnId: "amount", field: "amount", direction: "desc" }]
      },
      grouping: {
        footer: "bottom",
        model: { fields: ["status"] }
      },
      aggregation: {
        model: { fields: [{ field: "amount", function: "sum", alias: "amountTotal" }] }
      },
      columnUi: {
        resize: true,
        autoSize: true,
        reorder: true,
        menu: true,
        toolPanel: true
      },
      columnState: {
        columns: {
          amount: { width: 160, pinned: null }
        }
      },
      initialState: {
        columnState: {
          columns: {
            status: { hidden: false }
          }
        },
        sortModel: [{ columnId: "amount", field: "amount", direction: "desc" }],
        filterModel: { quickText: "approved" },
        groupModel: { fields: ["status"], expandedKeys: ["status=approved"] },
        selection: {
          mode: "row",
          rowKeys: ["A-001"],
          cells: [],
          ranges: []
        },
        pagination: { page: 2, pageSize: 50 },
        scroll: { top: 120, left: 40 },
        locale: locale.locale
      },
      merge: {
        enabled: true,
        getSpan: ({ row, field }) =>
          field === "status" && row.status === "approved"
            ? { rowSpan: 2, colSpan: 1 }
            : undefined
      },
      plugins: [plugin],
      security: {
        csp: { nonce: "test-nonce" },
        html: {
          allowHtmlRenderer: false,
          trustedTypesPolicyName: "onegrid-test",
          sanitizer: { sanitize: (html) => html }
        },
        url: { allowedProtocols: ["https:", "mailto:"] }
      },
      accessibility: {
        label: "Orders",
        description: "Server backed order data.",
        liveRegion: "polite"
      },
      editing: {
        startMode: "doubleClick",
        commitMode: "batch",
        undoRedo: { enabled: true, limit: 25 },
        readOnly: true,
        keyboard: {
          startOnEnter: true,
          commitOnEnter: true,
          moveOnTab: true,
          commitOnTab: true,
          cancelOnEscape: true,
          clearOnBackspace: true
        },
        blurAction: "cancel",
        validateOnCommit: true
      },
      export: {
        format: "xlsx",
        includeHeaders: true,
        includeHeaderMerges: true,
        includeCellMerges: true
      },
      import: {
        format: "csv",
        mode: "replace",
        hasHeaders: true,
        columns: ["id", "amount", "status"]
      },
      beforeEvents: {
        beforePageChange(event) {
          if (event.event.page < 1) {
            event.preventDefault("invalid-page");
          }
        }
      },
      locale: locale.locale
    };
    const beforeEvents: GridBeforeEventHandlers<OrderRow> = {
      beforeSortChange(event) {
        if (event.event.sortModel[0]?.field === "amount") {
          event.preventDefault("locked-sort");
        }
      },
      beforeCellEditCommit(event) {
        expectTypeOf(event.event.nextRow).toMatchTypeOf<OrderRow>();
      }
    };

    expectTypeOf<GridApi<OrderRow>["getPendingEdits"]>()
      .returns.toMatchTypeOf<readonly GridPendingEdit<OrderRow>[]>();
    expectTypeOf<GridApi<OrderRow>["startBatchEditSession"]>()
      .parameter(0).toMatchTypeOf<StartBatchEditSessionOptions | undefined>();
    expectTypeOf<GridApi<OrderRow>["startBatchEditSession"]>()
      .returns.toMatchTypeOf<GridBatchEditSession<OrderRow>>();
    expectTypeOf<GridApi<OrderRow>["getBatchEditSession"]>()
      .returns.toMatchTypeOf<GridBatchEditSession<OrderRow> | undefined>();
    expectTypeOf<GridApi<OrderRow>["commitBatchEditSession"]>()
      .returns.resolves.toMatchTypeOf<GridBatchEditSession<OrderRow> | undefined>();
    expectTypeOf<GridApi<OrderRow>["undoEdit"]>()
      .returns.toMatchTypeOf<NonNullable<GridEditHistoryState<OrderRow>["lastUndo"]> | undefined>();
    expectTypeOf<GridApi<OrderRow>["redoEdit"]>()
      .returns.toMatchTypeOf<NonNullable<GridEditHistoryState<OrderRow>["lastRedo"]> | undefined>();
    expectTypeOf<GridApi<OrderRow>["getEditHistoryState"]>()
      .returns.toMatchTypeOf<GridEditHistoryState<OrderRow>>();
    expectTypeOf<GridApi<OrderRow>["getState"]>().returns.toMatchTypeOf<GridStateSnapshot>();
    expectTypeOf<GridApi<OrderRow>["setState"]>().parameter(0).toMatchTypeOf<GridStateSnapshot>();
    expectTypeOf<GridApi<OrderRow>["getColumnState"]>().returns.toMatchTypeOf<ColumnUiState>();
    expectTypeOf<GridApi<OrderRow>["setColumnState"]>().parameter(0).toMatchTypeOf<ColumnUiState>();
    expectTypeOf<GridApi<OrderRow>["resetColumnState"]>().returns.toBeVoid();
    expectTypeOf<GridApi<OrderRow>["exportData"]>()
      .parameter(0).toMatchTypeOf<ExportOptions | undefined>();
    expectTypeOf<GridApi<OrderRow>["importData"]>()
      .parameter(1).toMatchTypeOf<ImportOptions<OrderRow> | undefined>();
    expectTypeOf<GridApi<OrderRow>["getGroupModel"]>().returns.toMatchTypeOf<
      NonNullable<GridOptions<OrderRow>["grouping"]>["model"]
    >();
    expectTypeOf<GridApi<OrderRow>["expandTreeNode"]>().returns.resolves.toBeVoid();
    expectTypeOf<GridApi<OrderRow>["getTreeSelection"]>().returns.toMatchTypeOf<readonly RowKey[]>();
    expectTypeOf<GridApi<OrderRow>["setLocale"]>().parameter(0).toMatchTypeOf<string>();
    expectTypeOf<GridApi<OrderRow>["getLocale"]>().returns.toMatchTypeOf<string>();
    expectTypeOf<GridApi<OrderRow>["hasPlugin"]>().returns.toMatchTypeOf<boolean>();
    expectTypeOf<GridApi<OrderRow>["getPluginExtensions"]>()
      .returns.toMatchTypeOf<readonly GridPluginExtension[]>();
    expectTypeOf<GridApi<OrderRow>["onBefore"]>()
      .parameter(0).toMatchTypeOf<keyof GridBeforeEventHandlers<OrderRow> & string>();
    expectTypeOf<GridApi<OrderRow>["hideColumn"]>().parameter(0).toMatchTypeOf<ColumnId>();
    expectTypeOf<GridApi<OrderRow>["scrollToColumn"]>().parameter(0).toMatchTypeOf<ColumnKey>();
    expectTypeOf<GridCellEditRequestedEvent<OrderRow>["nextRow"]>().toMatchTypeOf<OrderRow>();

    expect(amountColumnKey).toBe("amount");
    expect(options.columns).toHaveLength(5);
    expectTypeOf(beforeEvents).toMatchTypeOf<GridBeforeEventHandlers<OrderRow>>();
    expectTypeOf(options.initialState).toMatchTypeOf<GridStateSnapshot | undefined>();
    expectTypeOf(options.columnState).toMatchTypeOf<ColumnUiState | undefined>();
    expectTypeOf(options.defaultColumnDef).toMatchTypeOf<DataColumnDefaults<OrderRow> | undefined>();
    expectTypeOf(options.columnTypes).toMatchTypeOf<ColumnTypeRegistry<OrderRow> | undefined>();
    expectTypeOf(options).toMatchTypeOf<GridOptions<OrderRow>>();
  });

  it("types infinite row options through the shared GridOptions contract", () => {
    const dataSource: DataSource<OrderRow> = {
      async getRows(request) {
        expectTypeOf(request.rowModel).toMatchTypeOf<GetRowsRequest["rowModel"]>();
        return { rows: [], rowCount: 1_000_000, hasMore: true };
      }
    };

    const options: GridOptions<OrderRow> = {
      columns: [{ field: "id", headerName: "ID" }],
      rowModel: "infinite",
      dataSource,
      infinite: {
        blockSize: 100,
        maxBlocksInCache: 4,
        initialRowCount: 1_000_000
      }
    };

    expect(options.rowModel).toBe("infinite");
    expect(options.infinite?.blockSize).toBe(100);
  });

  it("types server row options and pivot models through GridOptions", () => {
    const options: GridOptions<OrderRow> = {
      columns: [{ field: "id", headerName: "ID" }],
      rowModel: "server",
      server: {
        pageSize: 50,
        initialPage: 1,
        groupKeys: ["status=approved"],
        snapshotVersion: "snapshot-1"
      },
      pagination: {
        mode: "cursor",
        position: "both",
        page: 2,
        pageSize: 50,
        pageSizeOptions: [25, 50, 100],
        pageGroupSize: 5,
        cursor: "cursor:50"
      },
      pivot: {
        enabled: true,
        serverOnly: true,
        panel: true,
        model: {
          rows: ["status"],
          columns: ["id"],
          values: [{ field: "amount", function: "sum", alias: "amountTotal", label: "Amount" }],
          totals: "both",
          subtotals: true
        }
      },
      summary: {
        enabled: true,
        position: "bottom",
        sticky: true
      },
      layout: {
        width: "100%",
        height: 360,
        bodyHeight: 240,
        minBodyHeight: 160
      },
      virtualization: {
        enabled: true,
        rowHeight: 32,
        overscan: { before: 4, after: 6 },
        columns: {
          enabled: true,
          overscan: { before: 1, after: 2 },
          maxDomColumns: 12
        },
        segmented: true,
        maxScrollHeight: 24_000_000
      }
    };

    expect(options.server?.pageSize).toBe(50);
    expect(options.pagination?.cursor).toBe("cursor:50");
    expect(options.pivot?.model?.values[0]).toMatchObject({ alias: "amountTotal" });
    expectTypeOf(options.virtualization).toMatchTypeOf<VirtualizationOptions | undefined>();
  });

  it("types viewport row options through GridOptions", () => {
    const options: GridOptions<OrderRow> = {
      columns: [{ field: "id", headerName: "ID" }],
      rowModel: "viewport",
      dataSource: {
        async getRows() {
          return { rows: [], rowCount: 10_000_000 };
        }
      },
      viewport: {
        rowHeight: 30,
        viewportSize: 20,
        overscan: 2,
        prefetchRows: 40,
        maxCachedRanges: 4,
        initialRowCount: 10_000_000
      }
    };

    expect(options.viewport?.initialRowCount).toBe(10_000_000);
  });

  it("types tree row options through GridOptions", () => {
    const options: GridOptions<OrderRow> = {
      columns: [{ field: "id", headerName: "ID" }],
      data: [{ id: "A", amount: 1, status: "approved" }],
      rowKey: "id",
      rowModel: "tree",
      tree: {
        treeColumnField: "id",
        childrenField: "children",
        hasChildrenField: "hasChildren",
        indentSize: 20,
        expandedKeys: ["A"],
        filterPolicy: "withAncestors",
        sortPolicy: "siblings",
        serverOnly: true,
        selection: { policy: "descendants", selectedKeys: ["A"] }
      }
    };

    expect(options.tree?.selection?.policy).toBe("descendants");
    expect(options.tree?.treeColumnField).toBe("id");
  });
});
