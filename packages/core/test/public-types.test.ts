import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ColumnDef,
  ColumnUiState,
  DataSource,
  GetRowsRequest,
  GridApi,
  GridOptions,
  GridPendingEdit,
  GridPlugin,
  RowKey,
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
        conditions: [{ field: "status", kind: "set", operator: "in", value: ["approved"] }]
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
      { field: "id", headerName: "ID", pinned: "left" },
      { field: "amount", headerName: "Amount", type: "number", summary: "sum" },
      {
        groupId: "workflow",
        headerName: "Workflow",
        children: [{ field: "status", headerName: "Status", filter: "set" }]
      }
    ];

    const plugin: GridPlugin<OrderRow> = {
      id: "audit",
      setup() {
        return undefined;
      }
    };

    const options: GridOptions<OrderRow> = {
      columns,
      rowModel: "server",
      filtering: {
        model: { quickText: "approved" }
      },
      sorting: {
        model: [{ field: "amount", direction: "desc" }]
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
        html: { allowHtmlRenderer: false }
      },
      accessibility: {
        label: "Orders",
        description: "Server backed order data.",
        liveRegion: "polite"
      },
      editing: {
        commitMode: "batch",
        blurAction: "cancel",
        validateOnCommit: true
      }
    };

    expectTypeOf<GridApi<OrderRow>["getPendingEdits"]>()
      .returns.toMatchTypeOf<readonly GridPendingEdit<OrderRow>[]>();
    expectTypeOf<GridApi<OrderRow>["getGroupModel"]>().returns.toMatchTypeOf<
      NonNullable<GridOptions<OrderRow>["grouping"]>["model"]
    >();
    expectTypeOf<GridApi<OrderRow>["expandTreeNode"]>().returns.resolves.toBeVoid();
    expectTypeOf<GridApi<OrderRow>["getTreeSelection"]>().returns.toMatchTypeOf<readonly RowKey[]>();

    expect(options.columns).toHaveLength(3);
    expectTypeOf(options.columnState).toMatchTypeOf<ColumnUiState | undefined>();
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
