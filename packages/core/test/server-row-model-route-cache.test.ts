import { describe, expect, it } from "vitest";
import { ServerRowModel } from "../src/index.js";
import type { GetRowsRequest } from "../src/index.js";

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

describe("server row model route cache", () => {
  it("keeps cursor and cache metadata isolated by server route", async () => {
    const requests: GetRowsRequest[] = [];
    const model = new ServerRowModel<ServerOrderRow>({
      pageSize: 2,
      initialCursor: "root:0",
      groupModel: { fields: ["region"] },
      dataSource: {
        async getRows(request) {
          requests.push(request);
          const route = request.groupKeys[0];
          return {
            rows: createRows(request.startRow, request.endRow),
            rowCount: 8,
            nextCursor: route === undefined ? `root:${request.endRow}` : `${route}:${request.endRow}`,
            hasMore: request.endRow < 8
          };
        }
      }
    });

    await model.loadPage(0);
    await model.loadRoutePage(["region=Seoul"], 0);
    const childPage = await model.loadRoutePage(["region=Seoul"], 1);
    const cachedChildPage = await model.loadRoutePage(["region=Seoul"], 1);
    const refreshedChildPage = await model.loadRoutePage(["region=Seoul"], 1, true);
    await model.loadPage(1);

    expect(requests.map((request) => ({
      groupKeys: request.groupKeys,
      cursor: request.cursor
    }))).toEqual([
      { groupKeys: [], cursor: "root:0" },
      { groupKeys: ["region=Seoul"], cursor: undefined },
      { groupKeys: ["region=Seoul"], cursor: "region=Seoul:2" },
      { groupKeys: ["region=Seoul"], cursor: "region=Seoul:2" },
      { groupKeys: [], cursor: "root:2" }
    ]);
    expect(childPage.cached).toBe(false);
    expect(cachedChildPage.cached).toBe(true);
    expect(refreshedChildPage.cached).toBe(false);
    expect(model.cachedEntries.map((entry) => ({
      routeKey: entry.routeKey,
      routePath: entry.routePath,
      page: entry.page
    }))).toEqual([
      { routeKey: "__root__", routePath: [], page: 0 },
      { routeKey: "region=Seoul", routePath: ["region=Seoul"], page: 1 },
      { routeKey: "__root__", routePath: [], page: 1 }
    ]);
    expect(model.getState().routes).toEqual([
      { route: [], page: 0, cursor: "root:0" },
      { route: [], page: 1, cursor: "root:2" },
      { route: [], page: 2, cursor: "root:4" },
      { route: ["region=Seoul"], page: 1, cursor: "region=Seoul:2" },
      { route: ["region=Seoul"], page: 2, cursor: "region=Seoul:4" }
    ]);
  });

  it("captures and restores page, cursor, and group expansion state", async () => {
    const restoredRequests: GetRowsRequest[] = [];
    const model = new ServerRowModel<ServerOrderRow>({
      pageSize: 4,
      initialCursor: "cursor:0",
      dataSource: {
        async getRows(request) {
          return {
            rows: createRows(request.startRow, request.endRow),
            rowCount: 12,
            nextCursor: `cursor:${request.endRow}`,
            hasMore: request.endRow < 12
          };
        }
      }
    });

    await model.loadPage(0);
    await model.loadPage(1);
    await model.expandGroup("group:region=Seoul");

    const restored = new ServerRowModel<ServerOrderRow>({
      pageSize: 4,
      initialCursor: "cursor:0",
      dataSource: {
        async getRows(request) {
          restoredRequests.push(request);
          return {
            rows: createRows(request.startRow, request.endRow),
            rowCount: 12,
            nextCursor: `cursor:${request.endRow}`,
            hasMore: request.endRow < 12
          };
        }
      }
    });
    restored.restoreState(model.getState());
    await restored.loadPage();

    expect(model.getState()).toMatchObject({
      rowModel: "server",
      page: 1,
      pageSize: 4,
      rowCount: 12,
      hasMore: true,
      expandedGroupKeys: ["group:region=Seoul"]
    });
    expect(restoredRequests[0]).toMatchObject({
      startRow: 4,
      endRow: 8,
      cursor: "cursor:4"
    });
    expect(restored.isGroupExpanded("group:region=Seoul")).toBe(true);
  });
});
