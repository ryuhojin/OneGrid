import type {
  GridOptions,
  InfiniteRowEntry,
  ServerRowEntry,
  TreeRowEntry,
  ViewportRowEntry
} from "@onegrid/core";

export function collectRenderedRows<TData>(
  options: GridOptions<TData>,
  infiniteEntries: readonly InfiniteRowEntry<TData>[],
  serverEntries: readonly ServerRowEntry<TData>[],
  viewportEntries: readonly ViewportRowEntry<TData>[],
  treeEntries: readonly TreeRowEntry<TData>[]
): readonly TData[] {
  if (infiniteEntries.length > 0) {
    return infiniteEntries
      .filter((entry): entry is Extract<InfiniteRowEntry<TData>, { readonly kind: "data" }> =>
        entry.kind === "data"
      )
      .map((entry) => entry.data);
  }

  if (serverEntries.length > 0) {
    return serverEntries
      .filter((entry): entry is Extract<ServerRowEntry<TData>, { readonly kind: "data" }> =>
        entry.kind === "data"
      )
      .map((entry) => entry.data);
  }

  if (viewportEntries.length > 0) {
    return viewportEntries.map((entry) => entry.data);
  }

  if (treeEntries.length > 0) {
    return treeEntries.map((entry) => entry.data);
  }

  return Array.isArray(options.data) ? options.data : [];
}
