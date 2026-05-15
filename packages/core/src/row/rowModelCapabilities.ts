import type { RowModelKind } from "../types/shared.js";

export type RowModelCapabilitySupport = "native" | "request" | "partial" | "notSupported";

export type RowModelCapabilityKey =
  | "rowIdentity"
  | "largeScroll"
  | "sort"
  | "filter"
  | "group"
  | "aggregate"
  | "pivot"
  | "transactions"
  | "pagination"
  | "selection"
  | "mergeMeta"
  | "stateSnapshot"
  | "duplicateRowKeys"
  | "retryStatus"
  | "liveUpdate"
  | "lazyChildren";

export interface RowModelCapability {
  readonly support: RowModelCapabilitySupport;
  readonly note: string;
}

export interface RowModelCapabilityProfile {
  readonly rowModel: RowModelKind;
  readonly ownership: "client" | "server" | "hybrid";
  readonly scale: string;
  readonly recommendedUse: string;
  readonly capabilities: Readonly<Record<RowModelCapabilityKey, RowModelCapability>>;
}

export type RowModelCapabilityMatrix = Readonly<Record<RowModelKind, RowModelCapabilityProfile>>;

function capability(support: RowModelCapabilitySupport, note: string): RowModelCapability {
  return Object.freeze({ support, note });
}

function profile(profileInput: RowModelCapabilityProfile): RowModelCapabilityProfile {
  return Object.freeze({
    ...profileInput,
    capabilities: Object.freeze(profileInput.capabilities)
  });
}

export const rowModelCapabilityMatrix = Object.freeze({
  client: profile({
    rowModel: "client",
    ownership: "client",
    scale: "Browser memory bounded datasets.",
    recommendedUse: "Local data, fast client-side transforms, offline-style workflows.",
    capabilities: {
      rowIdentity: capability("native", "Core resolves stable row keys from rowKey or generated ids."),
      largeScroll: capability("partial", "Uses row virtualization, but the full data array is client-owned."),
      sort: capability("native", "Sorts the loaded client row set in core."),
      filter: capability("native", "Filters the loaded client row set in core."),
      group: capability("native", "Builds group entries from loaded rows in core."),
      aggregate: capability("native", "Aggregates filtered and grouped client rows in core."),
      pivot: capability("native", "Client pivot executes against the loaded client row set."),
      transactions: capability("native", "Synchronous set, append, update, and remove transaction results."),
      pagination: capability("native", "Client pagination slices the loaded row set."),
      selection: capability("native", "Selection targets stable client row keys."),
      mergeMeta: capability("native", "Merge calculation can run against loaded rows."),
      stateSnapshot: capability("native", "Captures row-model state that does not serialize full row data."),
      duplicateRowKeys: capability("native", "Explicit duplicates fail by default or suffix by opt-in policy."),
      retryStatus: capability("notSupported", "No DataSource request is used by this model."),
      liveUpdate: capability("partial", "Use client transactions for push-style row changes."),
      lazyChildren: capability("notSupported", "Use tree row model for hierarchical child loading.")
    }
  }),
  infinite: profile({
    rowModel: "infinite",
    ownership: "server",
    scale: "Large append/seek datasets loaded by sparse blocks.",
    recommendedUse: "Unbounded lists where the server owns sorting/filtering and row count discovery.",
    capabilities: {
      rowIdentity: capability("partial", "Entries use logical row indexes unless the row data supplies keys."),
      largeScroll: capability("native", "Sparse block windows avoid materializing skipped rows."),
      sort: capability("request", "Sort model is forwarded to DataSource.getRows."),
      filter: capability("request", "Filter model is forwarded to DataSource.getRows."),
      group: capability("request", "Group model is forwarded, but route expansion is not owned here."),
      aggregate: capability("request", "Aggregate model is forwarded to the server response contract."),
      pivot: capability("notSupported", "Use server or viewport row model for pivot request contracts."),
      transactions: capability("notSupported", "Mutations are not part of the infinite block contract."),
      pagination: capability("partial", "Block windows replace page navigation as the primary access model."),
      selection: capability("partial", "Selection is stable only for loaded rows with durable keys."),
      mergeMeta: capability("partial", "Merge metadata can be consumed for loaded blocks only."),
      stateSnapshot: capability("native", "Captures append cursor, known row count, and cached block metadata."),
      duplicateRowKeys: capability("partial", "Loaded block keys can be validated; global uniqueness is server-owned."),
      retryStatus: capability("native", "Block requests use the shared DataSource retry/status pipeline."),
      liveUpdate: capability("notSupported", "Use viewport row model for synchronized live windows."),
      lazyChildren: capability("notSupported", "Use tree or server route expansion for hierarchical data.")
    }
  }),
  server: profile({
    rowModel: "server",
    ownership: "server",
    scale: "Enterprise remote datasets with route/page/cursor cache.",
    recommendedUse: "Authoritative server sort, filter, grouping, aggregation, pivot, and transactions.",
    capabilities: {
      rowIdentity: capability("native", "Loaded server rows are validated against the configured rowKey policy."),
      largeScroll: capability("partial", "Pages and cursors avoid full client data but are not continuous viewport sync."),
      sort: capability("request", "Sort model is serialized into DataSource.getRows requests."),
      filter: capability("request", "Filter model is serialized into DataSource.getRows requests."),
      group: capability("request", "Root and expanded group routes have independent caches."),
      aggregate: capability("request", "Aggregate model and group footers are server-owned."),
      pivot: capability("request", "Pivot model is forwarded to DataSource.getRows."),
      transactions: capability("request", "updateRows requests are delegated to the DataSource."),
      pagination: capability("native", "Page, cursor, and route cursors are tracked by core."),
      selection: capability("partial", "Selection should use durable row keys and server-aware all-row semantics."),
      mergeMeta: capability("request", "Server responses may return mergeMeta for loaded rows."),
      stateSnapshot: capability("native", "Captures page, cursors, route cache state, and snapshot version."),
      duplicateRowKeys: capability("native", "Loaded response duplicates fail by default or suffix by opt-in policy."),
      retryStatus: capability("native", "Requests and update transactions use standardized status metadata."),
      liveUpdate: capability("partial", "Use refresh or transactions; continuous window sync belongs to viewport."),
      lazyChildren: capability("partial", "Group route expansion is supported; tree child nodes use tree model.")
    }
  }),
  viewport: profile({
    rowModel: "viewport",
    ownership: "server",
    scale: "10M to 100M logical rows through segmented viewport windows.",
    recommendedUse: "High-scale fixed-height scrolling where the server owns rows and the browser owns only the visible window.",
    capabilities: {
      rowIdentity: capability("native", "Loaded viewport rows are validated against rowKey policy."),
      largeScroll: capability("native", "Fixed-height logical row windows map huge row counts onto bounded DOM and scroll ranges."),
      sort: capability("request", "Sort model is forwarded with each viewport window request."),
      filter: capability("request", "Filter model is forwarded with each viewport window request."),
      group: capability("request", "Group model can be forwarded, but hierarchical expansion is not viewport-owned."),
      aggregate: capability("request", "Aggregate model is forwarded to the data source."),
      pivot: capability("request", "Pivot model is forwarded to the data source."),
      transactions: capability("notSupported", "Viewport rows are read-window oriented; mutate through server APIs."),
      pagination: capability("notSupported", "Continuous logical scrolling replaces page navigation."),
      selection: capability("partial", "Visible-window selection is stable; all-row selection needs server semantics."),
      mergeMeta: capability("request", "Merge metadata can be consumed for loaded viewport ranges."),
      stateSnapshot: capability("native", "Captures visible/requested ranges, row count, and snapshot version."),
      duplicateRowKeys: capability("native", "Loaded viewport response duplicates follow rowKey policy."),
      retryStatus: capability("native", "Window requests use standardized DataSource status metadata."),
      liveUpdate: capability("native", "applyLiveUpdate patches cached visible rows by key or logical index."),
      lazyChildren: capability("notSupported", "Use tree row model for expandable hierarchy.")
    }
  }),
  tree: profile({
    rowModel: "tree",
    ownership: "hybrid",
    scale: "Loaded hierarchy plus optional server-owned lazy children.",
    recommendedUse: "Hierarchical records, lazy child loading, and descendant selection semantics.",
    capabilities: {
      rowIdentity: capability("native", "Tree nodes require stable keys across root and child loads."),
      largeScroll: capability("partial", "Virtualizes rendered nodes, not an unbounded flat 100M row space."),
      sort: capability("partial", "Core sorts loaded sibling sets unless serverOnly delegates children."),
      filter: capability("partial", "Core filters loaded nodes with ancestor/descendant policies."),
      group: capability("notSupported", "Tree hierarchy is explicit data, not row grouping."),
      aggregate: capability("notSupported", "Use grouping or server responses for aggregate rows."),
      pivot: capability("notSupported", "Use client/server pivot outside the tree row model."),
      transactions: capability("partial", "Loaded node replacement is supported through tree normalization paths."),
      pagination: capability("notSupported", "Tree expansion state, not pages, controls rendered rows."),
      selection: capability("native", "Self and descendant selection policies are owned by core."),
      mergeMeta: capability("partial", "Cell merge can apply to rendered tree rows after flattening."),
      stateSnapshot: capability("native", "Captures expansion, selection, and loaded-node state metadata."),
      duplicateRowKeys: capability("native", "Root and lazy child keys follow the configured duplicate policy."),
      retryStatus: capability("native", "Lazy child requests use the shared DataSource retry/status pipeline."),
      liveUpdate: capability("partial", "Refresh or reload affected child branches for server-owned trees."),
      lazyChildren: capability("native", "getChildren loads expandable child branches on demand.")
    }
  })
}) satisfies RowModelCapabilityMatrix;

export function getRowModelCapabilityProfile(rowModel: RowModelKind): RowModelCapabilityProfile {
  return rowModelCapabilityMatrix[rowModel];
}
