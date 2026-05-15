import { describe, expect, expectTypeOf, it } from "vitest";
import {
  getRowModelCapabilityProfile,
  rowModelCapabilityMatrix
} from "../src/index.js";
import type {
  DataSource,
  GetRowsRequest,
  GridOptions,
  RowModelCapabilityProfile,
  VirtualizationOptions
} from "../src/index.js";

interface OrderRow {
  readonly id: string;
  readonly amount: number;
  readonly status: "draft" | "approved";
}

describe("@onegrid/core row model public types", () => {
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

  it("exports row model capability profiles as public contracts", () => {
    const serverProfile: RowModelCapabilityProfile = getRowModelCapabilityProfile("server");
    expect(serverProfile.capabilities.group.support).toBe("request");
    expect(rowModelCapabilityMatrix.viewport.capabilities.largeScroll.support).toBe("native");
  });
});
