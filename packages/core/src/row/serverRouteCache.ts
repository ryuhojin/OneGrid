import { normalizeServerPage } from "./serverRowUtils.js";
import type {
  ServerRowCursorSnapshot,
  ServerRowRouteSnapshot
} from "./rowModelState.js";

const ROUTE_KEY_SEPARATOR = "\u001f";

export const ROOT_SERVER_ROUTE_KEY = "__root__";

export interface ServerRouteCursorStore {
  readonly entries: ReadonlyMap<string, ServerRouteCursorEntry>;
  readonly initialCursor?: string;
}

export interface ServerRouteCursorEntry {
  readonly route: readonly string[];
  readonly cursors: ReadonlyMap<number, string | undefined>;
}

export function createServerRouteCursorStore(initialCursor?: string): ServerRouteCursorStore {
  const store: ServerRouteCursorStore =
    initialCursor === undefined
      ? { entries: new Map<string, ServerRouteCursorEntry>() }
      : { entries: new Map<string, ServerRouteCursorEntry>(), initialCursor };
  resetServerRouteCursorStore(store);
  return store;
}

export function createServerRoutePath(
  groupKeys: readonly string[] | undefined,
  fallbackGroupKeys?: readonly string[]
): readonly string[] {
  return Object.freeze([...(groupKeys ?? fallbackGroupKeys ?? [])]);
}

export function createServerRouteKey(route: readonly string[]): string {
  return route.length === 0 ? ROOT_SERVER_ROUTE_KEY : route.join(ROUTE_KEY_SEPARATOR);
}

export function getServerRouteCursor(
  store: ServerRouteCursorStore,
  route: readonly string[],
  page: number
): string | undefined {
  return store.entries.get(createServerRouteKey(route))?.cursors.get(normalizeServerPage(page));
}

export function setServerRouteCursor(
  store: ServerRouteCursorStore,
  route: readonly string[],
  page: number,
  cursor: string | undefined
): void {
  const normalizedPage = normalizeServerPage(page);
  const entry = ensureRouteEntry(store, route);
  const cursors = entry.cursors as Map<number, string | undefined>;
  if (cursor === undefined) {
    cursors.delete(normalizedPage);
    return;
  }
  cursors.set(normalizedPage, cursor);
}

export function resetServerRouteCursor(
  store: ServerRouteCursorStore,
  route: readonly string[]
): void {
  const routeKey = createServerRouteKey(route);
  (store.entries as Map<string, ServerRouteCursorEntry>).delete(routeKey);
  if (route.length === 0 && store.initialCursor !== undefined) {
    setServerRouteCursor(store, [], 0, store.initialCursor);
  }
}

export function resetServerRouteCursorStore(store: ServerRouteCursorStore): void {
  (store.entries as Map<string, ServerRouteCursorEntry>).clear();
  if (store.initialCursor !== undefined) {
    setServerRouteCursor(store, [], 0, store.initialCursor);
  }
}

export function snapshotServerRouteCursors(
  store: ServerRouteCursorStore
): readonly ServerRowRouteSnapshot[] {
  const snapshots = [...store.entries.values()].flatMap((entry) =>
    [...entry.cursors.entries()].map(([page, cursor]) =>
      Object.freeze({
        route: Object.freeze([...entry.route]),
        page,
        ...(cursor === undefined ? {} : { cursor })
      })
    )
  );
  return Object.freeze(snapshots);
}

export function snapshotRootServerCursors(
  store: ServerRouteCursorStore
): readonly ServerRowCursorSnapshot[] {
  const root = store.entries.get(ROOT_SERVER_ROUTE_KEY);
  if (!root) {
    return Object.freeze([]);
  }
  return Object.freeze(
    [...root.cursors.entries()].map(([page, cursor]) =>
      Object.freeze({
        page,
        ...(cursor === undefined ? {} : { cursor })
      })
    )
  );
}

export function restoreServerRouteCursors(
  store: ServerRouteCursorStore,
  routes: readonly ServerRowRouteSnapshot[] | undefined,
  rootCursors: readonly ServerRowCursorSnapshot[] | undefined
): void {
  (store.entries as Map<string, ServerRouteCursorEntry>).clear();

  if (routes?.length) {
    routes.forEach((route) =>
      setServerRouteCursor(store, route.route, normalizeServerPage(route.page), route.cursor)
    );
    return;
  }

  if (rootCursors?.length) {
    rootCursors.forEach((cursor) =>
      setServerRouteCursor(store, [], normalizeServerPage(cursor.page), cursor.cursor)
    );
    return;
  }

  resetServerRouteCursorStore(store);
}

function ensureRouteEntry(
  store: ServerRouteCursorStore,
  route: readonly string[]
): ServerRouteCursorEntry {
  const routeKey = createServerRouteKey(route);
  const current = store.entries.get(routeKey);
  if (current) {
    return current;
  }

  const entry = Object.freeze({
    route: Object.freeze([...route]),
    cursors: new Map<number, string | undefined>()
  });
  (store.entries as Map<string, ServerRouteCursorEntry>).set(routeKey, entry);
  return entry;
}
