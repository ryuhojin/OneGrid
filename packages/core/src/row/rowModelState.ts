import type { RowKey, RowModelKind, ViewportRange } from "../types/shared.js";

export const ROW_MODEL_STATE_SNAPSHOT_VERSION = 1;

export type RowModelStateSnapshot =
  | ClientRowModelStateSnapshot
  | InfiniteRowModelStateSnapshot
  | ServerRowModelStateSnapshot
  | ViewportRowModelStateSnapshot
  | TreeRowModelStateSnapshot;

export interface ClientRowModelStateSnapshot {
  readonly version?: number;
  readonly rowModel: "client";
  readonly rowCount?: number;
}

export interface InfiniteRowModelStateSnapshot {
  readonly version?: number;
  readonly rowModel: "infinite";
  readonly rowCount?: number;
  readonly blockSize?: number;
  readonly nextAppendBlockIndex?: number;
  readonly hasMore?: boolean;
}

export interface ServerRowModelStateSnapshot {
  readonly version?: number;
  readonly rowModel: "server";
  readonly page?: number;
  readonly pageSize?: number;
  readonly rowCount?: number;
  readonly hasMore?: boolean;
  readonly expandedGroupKeys?: readonly string[];
  readonly collapsedGroupKeys?: readonly string[];
  readonly cursors?: readonly ServerRowCursorSnapshot[];
  readonly routes?: readonly ServerRowRouteSnapshot[];
  readonly snapshotVersion?: string;
}

export interface ServerRowCursorSnapshot {
  readonly page: number;
  readonly cursor?: string;
}

export interface ServerRowRouteSnapshot extends ServerRowCursorSnapshot {
  readonly route: readonly string[];
}

export interface ViewportRowModelStateSnapshot {
  readonly version?: number;
  readonly rowModel: "viewport";
  readonly rowCount?: number;
  readonly range?: ViewportRange;
}

export interface TreeRowModelStateSnapshot {
  readonly version?: number;
  readonly rowModel: "tree";
  readonly rowCount?: number;
  readonly expandedKeys?: readonly RowKey[];
  readonly selectedKeys?: readonly RowKey[];
}

export function freezeRowModelStateSnapshot(
  snapshot: RowModelStateSnapshot
): RowModelStateSnapshot {
  switch (snapshot.rowModel) {
    case "client":
      return Object.freeze({
        version: snapshot.version ?? ROW_MODEL_STATE_SNAPSHOT_VERSION,
        rowModel: "client",
        ...(snapshot.rowCount === undefined ? {} : { rowCount: normalizeCount(snapshot.rowCount) })
      });
    case "infinite":
      return Object.freeze({
        version: snapshot.version ?? ROW_MODEL_STATE_SNAPSHOT_VERSION,
        rowModel: "infinite",
        ...(snapshot.rowCount === undefined ? {} : { rowCount: normalizeCount(snapshot.rowCount) }),
        ...(snapshot.blockSize === undefined ? {} : { blockSize: normalizeCount(snapshot.blockSize) }),
        ...(snapshot.nextAppendBlockIndex === undefined
          ? {}
          : { nextAppendBlockIndex: normalizeCount(snapshot.nextAppendBlockIndex) }),
        ...(snapshot.hasMore === undefined ? {} : { hasMore: snapshot.hasMore })
      });
    case "server":
      return Object.freeze({
        version: snapshot.version ?? ROW_MODEL_STATE_SNAPSHOT_VERSION,
        rowModel: "server",
        ...(snapshot.page === undefined ? {} : { page: normalizeCount(snapshot.page) }),
        ...(snapshot.pageSize === undefined ? {} : { pageSize: normalizePositive(snapshot.pageSize) }),
        ...(snapshot.rowCount === undefined ? {} : { rowCount: normalizeCount(snapshot.rowCount) }),
        ...(snapshot.hasMore === undefined ? {} : { hasMore: snapshot.hasMore }),
        ...(snapshot.expandedGroupKeys === undefined
          ? {}
          : { expandedGroupKeys: Object.freeze([...snapshot.expandedGroupKeys]) }),
        ...(snapshot.collapsedGroupKeys === undefined
          ? {}
          : { collapsedGroupKeys: Object.freeze([...snapshot.collapsedGroupKeys]) }),
        ...(snapshot.cursors === undefined ? {} : { cursors: cloneCursors(snapshot.cursors) }),
        ...(snapshot.routes === undefined ? {} : { routes: cloneRoutes(snapshot.routes) }),
        ...(snapshot.snapshotVersion === undefined ? {} : { snapshotVersion: snapshot.snapshotVersion })
      });
    case "viewport":
      return Object.freeze({
        version: snapshot.version ?? ROW_MODEL_STATE_SNAPSHOT_VERSION,
        rowModel: "viewport",
        ...(snapshot.rowCount === undefined ? {} : { rowCount: normalizeCount(snapshot.rowCount) }),
        ...(snapshot.range === undefined
          ? {}
          : { range: Object.freeze({ ...snapshot.range }) })
      });
    case "tree":
      return Object.freeze({
        version: snapshot.version ?? ROW_MODEL_STATE_SNAPSHOT_VERSION,
        rowModel: "tree",
        ...(snapshot.rowCount === undefined ? {} : { rowCount: normalizeCount(snapshot.rowCount) }),
        ...(snapshot.expandedKeys === undefined ? {} : { expandedKeys: Object.freeze([...snapshot.expandedKeys]) }),
        ...(snapshot.selectedKeys === undefined ? {} : { selectedKeys: Object.freeze([...snapshot.selectedKeys]) })
      });
  }
}

export function isRowModelStateFor(
  state: RowModelStateSnapshot | undefined,
  rowModel: RowModelKind
): boolean {
  return state?.rowModel === rowModel;
}

function cloneCursors(
  cursors: readonly ServerRowCursorSnapshot[]
): readonly ServerRowCursorSnapshot[] {
  return Object.freeze(
    cursors.map((cursor) => Object.freeze({
      page: normalizeCount(cursor.page),
      ...(cursor.cursor === undefined ? {} : { cursor: cursor.cursor })
    }))
  );
}

function cloneRoutes(
  routes: readonly ServerRowRouteSnapshot[]
): readonly ServerRowRouteSnapshot[] {
  return Object.freeze(
    routes.map((route) => Object.freeze({
      route: Object.freeze([...route.route]),
      page: normalizeCount(route.page),
      ...(route.cursor === undefined ? {} : { cursor: route.cursor })
    }))
  );
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function normalizePositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1;
}
