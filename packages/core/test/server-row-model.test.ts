import { describe, expect, it } from "vitest";
import {
  serializeServerFilterModel,
  serializeServerSortModel,
  ServerRowModel
} from "../src/index.js";
import type { GetRowsRequest, RowUpdate } from "../src/index.js";

interface ServerOrderRow {
  readonly id: string;
  readonly region: string;
  readonly amount: number;
  readonly status: "Draft" | "Approved" | "Rejected";
}

function createRows(start: number, end: number): readonly ServerOrderRow[] {
  return Array.from({ length: end - start }, (_, index) => ({
    id: `ORD-${start + index}`,
    region: index % 2 === 0 ? "Seoul" : "Busan",
    amount: 1000 + start + index,
    status: index % 2 === 0 ? "Approved" : "Draft"
  }));
}

describe("server row model", () => {
  it("builds server requests with sort, filter, group, aggregate, and pivot models", async () => {
    let capturedRequest: GetRowsRequest | undefined;
    const model = new ServerRowModel<ServerOrderRow>({
      pageSize: 25,
      sortModel: [{ field: "amount", direction: "desc" }],
      filterModel: {
        conditions: [{ field: "status", kind: "set", operator: "in", value: ["Approved"] }]
      },
      groupModel: { fields: ["region"] },
      groupKeys: ["region=Seoul"],
      aggregateModel: { fields: [{ field: "amount", function: "sum", alias: "amountTotal" }] },
      pivotModel: { rows: ["region"], columns: ["status"], values: ["amount"] },
      dataSource: {
        async getRows(request) {
          capturedRequest = request;
          return { rows: createRows(request.startRow, request.endRow), rowCount: 100 };
        }
      }
    });

    const result = await model.loadPage(2);

    expect(result.request.rowModel).toBe("server");
    expect(capturedRequest?.startRow).toBe(50);
    expect(capturedRequest?.endRow).toBe(75);
    expect(capturedRequest?.sortModel).toEqual([{ field: "amount", direction: "desc" }]);
    expect(capturedRequest?.filterModel.conditions).toHaveLength(1);
    expect(capturedRequest?.groupModel.fields).toEqual(["region"]);
    expect(capturedRequest?.groupKeys).toEqual(["region=Seoul"]);
    expect(capturedRequest?.aggregateModel?.fields[0]?.alias).toBe("amountTotal");
    expect(capturedRequest?.pivotModel?.values).toEqual(["amount"]);
    expect(result.entries).toHaveLength(25);
  });

  it("serializes server models with stable key ordering", () => {
    expect(
      serializeServerSortModel([
        { priority: 2, direction: "desc", field: "amount" },
        { field: "id", direction: "asc" }
      ])
    ).toBe(
      '[{"direction":"desc","field":"amount","priority":2},{"direction":"asc","field":"id"}]'
    );
    expect(
      serializeServerFilterModel({
        quickText: "approved",
        conditions: [{ value: ["Approved"], operator: "in", kind: "set", field: "status" }]
      })
    ).toBe(
      '{"conditions":[{"field":"status","kind":"set","operator":"in","value":["Approved"]}],"quickText":"approved"}'
    );
  });

  it("uses cached server pages until refresh is requested", async () => {
    let requestCount = 0;
    const model = new ServerRowModel<ServerOrderRow>({
      pageSize: 5,
      dataSource: {
        async getRows(request) {
          requestCount += 1;
          return { rows: createRows(request.startRow, request.endRow), rowCount: 50 };
        }
      }
    });

    const first = await model.loadPage(0);
    const second = await model.loadPage(0);
    const refreshed = await model.refresh();

    expect(requestCount).toBe(2);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(refreshed.cached).toBe(false);
  });

  it("dedupes concurrent server page requests", async () => {
    let requestCount = 0;
    const model = new ServerRowModel<ServerOrderRow>({
      pageSize: 3,
      dataSource: {
        async getRows(request) {
          requestCount += 1;
          return { rows: createRows(request.startRow, request.endRow), rowCount: 30 };
        }
      }
    });

    const [first, second] = await Promise.all([model.loadPage(1), model.loadPage(1)]);

    expect(requestCount).toBe(1);
    expect(first.cacheKey).toBe(second.cacheKey);
    expect(model.entries).toHaveLength(3);
  });

  it("passes cursor metadata and remembers next cursors by page", async () => {
    const cursors: Array<string | undefined> = [];
    const model = new ServerRowModel<ServerOrderRow>({
      pageSize: 4,
      initialCursor: "cursor:0",
      dataSource: {
        async getRows(request) {
          cursors.push(request.cursor);
          return {
            rows: createRows(request.startRow, request.endRow),
            rowCount: 12,
            nextCursor: `cursor:${request.endRow}`,
            hasMore: request.endRow < 12
          };
        }
      }
    });

    const first = await model.loadPage(0);
    const second = await model.loadPage(1);

    expect(cursors).toEqual(["cursor:0", "cursor:4"]);
    expect(first.nextCursor).toBe("cursor:4");
    expect(second.hasMore).toBe(true);
    expect(model.hasMore).toBe(true);
  });

  it("renders server group metadata as group and footer entries", async () => {
    const model = new ServerRowModel<ServerOrderRow>({
      pageSize: 5,
      rowKey: "id",
      dataSource: {
        async getRows() {
          return {
            rows: [{ id: "ORD-1", region: "Seoul", amount: 1000, status: "Approved" }],
            groupMeta: [
              {
                key: "Seoul",
                field: "region",
                value: "Seoul",
                level: 0,
                childCount: 1,
                expanded: true,
                aggregateValues: { amountTotal: 1000, rowCount: 1 }
              },
              {
                key: "Seoul",
                field: "region",
                value: "Seoul",
                level: 0,
                childCount: 1,
                footer: true,
                aggregateValues: { amountTotal: 1000, rowCount: 1 }
              }
            ]
          };
        }
      }
    });

    const result = await model.loadPage(0);

    expect(result.entries.map((entry) => entry.kind)).toEqual(["group", "data", "groupFooter"]);
    expect(result.rowCount).toBe(3);
    expect(result.entries[0]).toMatchObject({
      kind: "group",
      key: "Seoul",
      aggregateValues: { amountTotal: 1000, rowCount: 1 }
    });
  });

  it("applies server transaction updates to cached rows", async () => {
    const updates: RowUpdate<ServerOrderRow>[] = [
      { rowKey: "ORD-0", row: { status: "Approved" } }
    ];
    const model = new ServerRowModel<ServerOrderRow>({
      pageSize: 2,
      rowKey: "id",
      dataSource: {
        async getRows(request) {
          return { rows: createRows(request.startRow, request.endRow), rowCount: 10 };
        },
        async updateRows(request) {
          expect(request.updates).toEqual(updates);
          return {
            rows: [{ id: "ORD-0", region: "Seoul", amount: 1000, status: "Rejected" }]
          };
        }
      }
    });

    await model.loadPage(0);
    await model.applyTransaction(updates);

    const firstEntry = model.entries[0];
    expect(firstEntry?.kind).toBe("data");
    if (firstEntry?.kind === "data") {
      expect(firstEntry.data.status).toBe("Rejected");
    }
  });
});
