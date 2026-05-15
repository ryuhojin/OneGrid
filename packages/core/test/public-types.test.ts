import { describe, expect, expectTypeOf, it } from "vitest";
import { getLocale } from "../src/index.js";
import type {
  ApplyColumnStateParams,
  ColumnDef,
  ColumnId,
  ColumnKey,
  ColumnMenuExtensionPayload,
  ColumnStateApplyResult,
  ColumnTypeRegistry,
  ColumnUiState,
  ContextMenuExtensionPayload,
  DataColumnDefaults,
  DataSource,
  DataSourceError,
  DataSourceOptions,
  DataSourceStatusSnapshot,
  ExportOptions,
  GetColumnStateOptions,
  GetRowsRequest,
  GetRowsResult,
  GridApi,
  GridBatchEditSession,
  GridBeforeEventHandlers,
  GridEditHistoryState,
  GridCellEditRequestedEvent,
  GridExportAdapterPayload,
  GridImportAdapterPayload,
  GridOptions,
  HeaderMergeValidationResult,
  GridPendingEdit,
  GridPlugin,
  GridPluginExtension,
  GridPluginExtensionContribution,
  GridStateSnapshot,
  HtmlSanitizerContext,
  ImportOptions,
  LocaleDefinition,
  PivotModel,
  RowKey,
  RowModelStateSnapshot,
  ServerRowRouteSnapshot,
  StartBatchEditSessionOptions,
  ThemeExtensionPayload
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
    const pivotResult: GetRowsResult<OrderRow> = {
      rows: [],
      columns: [{ field: "amount", headerName: "Amount" }],
      rowCount: 0
    };
    const dataSourceOptions: DataSourceOptions = {
      retry: { attempts: 2, delayMs: 0, backoff: "none" }
    };
    const dataSourceError: DataSourceError = {
      name: "DataSourceError",
      message: "Rows could not load.",
      requestKind: "getRows",
      requestId: "request-1",
      attempt: 1,
      retryable: true,
      recoverable: true
    };
    const dataSourceStatus: DataSourceStatusSnapshot = {
      requestKind: "getRows",
      requestId: "request-1",
      status: "error",
      attempt: 1,
      maxAttempts: 2,
      retryable: true,
      recoverable: true,
      error: dataSourceError
    };
    expect(pivotResult.columns).toHaveLength(1);
    expectTypeOf(pivotResult.columns).toMatchTypeOf<readonly ColumnDef<OrderRow>[] | undefined>();
    expect(dataSourceOptions.retry?.attempts).toBe(2);
    expect(dataSourceStatus.error?.message).toBe("Rows could not load.");
  });

  it("keeps options, columns, and plugins strongly typed", () => {
    const columns: readonly ColumnDef<OrderRow>[] = [
      {
        columnId: "order-id",
        field: "id",
        headerName: "ID",
        pinned: "left",
        hideable: false,
        lockPosition: true
      },
      { field: "amount", headerName: "Amount", type: "money", summary: "sum" },
      {
        field: "status",
        headerName: "Status",
        editable: true,
        editTrigger: "singleClick",
        pinnable: false,
        lockPinned: true,
        lockVisible: true
      },
      {
        columnId: "row-actions",
        headerName: "Actions",
        renderer: { kind: "text", render: () => "Open" }
      },
      {
        columnId: "workflow-group",
        groupId: "workflow",
        headerName: "Workflow",
        openByDefault: false,
        children: [
          {
            columnId: "grouped-status",
            field: "status",
            headerName: "Grouped Status",
            columnGroupShow: "open",
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
        context.registerExtension<GridImportAdapterPayload<OrderRow>>({
          id: "audit-import",
          point: "import.adapter",
          payload: {
            format: "audit-json",
            import({ content }) {
              return {
                rows: JSON.parse(String(content)) as readonly OrderRow[],
                rowCount: 1,
                rejected: []
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
      rowKey: "id",
      duplicateRowKeyPolicy: "error",
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
          sanitizer: {
            name: "test-sanitizer",
            mode: "external",
            sanitize: (html, context) => `${context?.allowedProtocols.join(",") ?? ""}:${html}`
          }
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
    const sanitizerContext: HtmlSanitizerContext = {
      allowedProtocols: ["https:"],
      trustedTypesPolicyName: "onegrid-test"
    };

    expectTypeOf<GridApi<OrderRow>["getPendingEdits"]>()
      .returns.toMatchTypeOf<readonly GridPendingEdit<OrderRow>[]>();
    expect(sanitizerContext.allowedProtocols).toEqual(["https:"]);
    expectTypeOf<GridApi<OrderRow>["startBatchEditSession"]>()
      .parameter(0).toMatchTypeOf<StartBatchEditSessionOptions | undefined>();
    const headerMergeValidation: HeaderMergeValidationResult = {
      valid: false,
      issues: [
        {
          kind: "unknown-column-id",
          ruleIndex: 0,
          ruleId: "bad-rule",
          columnId: "missing",
          message: "Unknown headerMerge columnId."
        }
      ]
    };
    const rowModelState: RowModelStateSnapshot = {
      rowModel: "viewport",
      rowCount: 10_000_000,
      range: { firstRow: 100, lastRow: 120 }
    };
    const serverRoute: ServerRowRouteSnapshot = {
      route: ["region=Capital"],
      page: 1,
      cursor: "region=Capital:50"
    };
    const gridState: GridStateSnapshot = { rowModelState };
    expect(headerMergeValidation.valid).toBe(false);
    expect(serverRoute.route).toEqual(["region=Capital"]);
    expectTypeOf(gridState.rowModelState).toMatchTypeOf<RowModelStateSnapshot | undefined>();
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
    expectTypeOf<GridApi<OrderRow>["getColumnState"]>()
      .parameter(0).toMatchTypeOf<GetColumnStateOptions | undefined>();
    expectTypeOf<GridApi<OrderRow>["setColumnState"]>().parameter(0).toMatchTypeOf<ColumnUiState>();
    expectTypeOf<GridApi<OrderRow>["applyColumnState"]>()
      .parameter(0).toMatchTypeOf<ApplyColumnStateParams>();
    expectTypeOf<GridApi<OrderRow>["applyColumnState"]>()
      .returns.toMatchTypeOf<ColumnStateApplyResult>();
    expectTypeOf<GridApi<OrderRow>["resetColumnState"]>().returns.toBeVoid();
    expectTypeOf<GridApi<OrderRow>["setColumnGroupOpen"]>().parameter(0).toMatchTypeOf<ColumnId>();
    expectTypeOf<GridApi<OrderRow>["toggleColumnGroup"]>().parameter(0).toMatchTypeOf<ColumnId>();
    expectTypeOf<GridApi<OrderRow>["exportData"]>()
      .parameter(0).toMatchTypeOf<ExportOptions | undefined>();
    expectTypeOf<GridApi<OrderRow>["importData"]>()
      .parameter(1).toMatchTypeOf<ImportOptions<OrderRow> | undefined>();
    expectTypeOf<GridApi<OrderRow>["getGroupModel"]>().returns.toMatchTypeOf<
      NonNullable<GridOptions<OrderRow>["grouping"]>["model"]
    >();
    expectTypeOf<GridApi<OrderRow>["setPivotModel"]>().parameter(0).toMatchTypeOf<PivotModel>();
    expectTypeOf<GridApi<OrderRow>["getPivotModel"]>().returns.toMatchTypeOf<PivotModel | undefined>();
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

});
