# API_CHANGELOG.md — OneGrid Public API Change Log

> 목적: 1.0 릴리즈 전까지 public API 변경 이력을 추적한다.

---

## 작성 규칙

```md
## YYYY-MM-DD — 변경 제목

- Status: proposed | accepted | deprecated | removed
- Area: GridOptions | ColumnDef | DataSource | GridApi | Events | Wrapper | Theme | Security
- Change:
- Reason:
- Impact:
- Migration:
```

---

## Initial

아직 기록된 public API 변경 없음.

## 2026-05-15 — Theme validation gate

- Status: accepted
- Area: Theme
- Change:
  - `@onegrid/themes` now exports `validateSiTheme()` and `defaultThemeContrastPairs`.
  - Public validation result types expose contrast checks, errors, warnings, and issue codes.
- Reason: SI tenant palettes need a release gate for color contrast, minimum hit-target sizes, and
  unsafe CSS variable values before a brand theme is applied across enterprise grids.
- Impact: Additive API. Existing `createSiTheme()` behavior is unchanged.
- Migration: Continue creating themes with `createSiTheme()`. Run `validateSiTheme(theme)` in
  CI, theme builders, or deployment review flows before applying customer palettes.

## 2026-05-15 — Wrapper renderer security boundary

- Status: accepted
- Area: Wrapper | Security | Documentation
- Change:
  - React `reactRenderers` and Vue slot renderers are documented as framework-owned subtrees mounted
    inside OneGrid-owned safe placeholder elements.
  - The XSS guide now distinguishes OneGrid-owned core renderer sinks from React/Vue-owned HTML
    sinks such as `dangerouslySetInnerHTML` and `v-html`.
- Reason: Wrapper custom renderer slots must not be mistaken for sanitizer-backed HTML sinks.
- Impact: Documentation-only clarification. Runtime behavior is unchanged.
- Migration: Use framework text bindings for user data. Use core `kind: "html"` plus
  `security.html.sanitizer` when OneGrid must own sanitization, or sanitize application HTML before
  using framework HTML sinks.

## 2026-05-15 — Sanitizer adapter hardening

- Status: accepted
- Area: Security | GridOptions | DOM
- Change:
  - `HtmlSanitizer` now carries optional `name`, `mode`, and `HtmlSanitizerContext` metadata.
  - `@onegrid/dom` exports `createAllowlistHtmlSanitizer()` and `sanitizeHtmlWithAllowlist()`.
  - Sanitizer output is post-sanitized by the DOM HTML boundary before it is written to `innerHTML`.
  - The allowlist parser and final HTML sink both use the configured Trusted Types policy when the
    browser enforces `require-trusted-types-for 'script'`.
- Reason: Markup-preserving sanitizer adapters must be injectable without turning a misconfigured
  adapter into a raw HTML sink.
- Impact: Additive API. Existing sanitizers that implement `sanitize(html)` still work.
- Migration: Use `strictTextOnlySanitizer` for text-only safety, `createAllowlistHtmlSanitizer()`
  for dependency-free simple markup, or an organization-reviewed external adapter for regulated SI
  deployments.

## 2026-05-15 — Server result column schema

- Status: accepted
- Area: DataSource | RowModel | Pivot
- Change:
  - `GetRowsResult<TData>.columns` was added as an optional server-provided result schema.
  - `ServerLoadResult<TData>.columns` carries that schema through the server row model.
  - DOM rendering can use server result columns while pivot builder panels keep the original source
    columns as the field catalog.
- Reason: Server-side pivot and other remote projections need to change rendered result columns
  without moving projection logic into browser wrappers.
- Impact: Additive API. Existing data sources that return only rows continue to work.
- Migration: Return `columns` from `DataSource.getRows()` when a server projection changes the
  result shape, especially for `pivot.serverOnly`.

## 2026-05-15 — Pivot builder API

- Status: accepted
- Area: GridApi | Pivot | Wrapper | DOM
- Change:
  - `GridApi.setPivotModel(model)` and `GridApi.getPivotModel()` were added.
  - React refs and Vue exposes now include the same pivot model methods.
  - The DOM pivot panel is now a draft/apply builder for row, column, value, totals, and subtotal
    configuration instead of a read-only inspector.
- Reason: Pivot UI mutation must use the same public model contract as vanilla, React, Vue, client
  pivot, and server pivot requests.
- Impact: Additive API. Existing `pivot.model` options still work.
- Migration: Existing code can keep passing `pivot.model`. Use `setPivotModel()` for runtime
  pivot builder changes or external pivot configuration panels.

## 2026-05-15 — Official document adapter packages

- Status: accepted
- Area: Plugins | Export | Import
- Change:
  - `@onegrid/adapter-xlsx-exceljs` was added as the official ExcelJS-backed XLSX export/import
    adapter package.
  - `@onegrid/adapter-pdf-pdfkit` was added as the official PDFKit-backed PDF export adapter package.
  - `createServerDocumentExportAdapter()` and `createServerDocumentExportAdapterPlugin()` were added
    to `@onegrid/adapters` for server-side regulated document rendering.
- Reason: CJK/custom-font PDF, external compressed XLSX compatibility, and regulated document
  rendering require vetted engines without forcing those dependencies into `@onegrid/core`.
- Impact: Additive API. Built-in CSV/JSON/XLSX/PDF behavior remains available.
- Migration: Keep using built-in formats for lightweight exports. Register the official adapters
  when a deployment requires engine-backed XLSX/PDF fidelity.

## 2026-05-14 — Merge span indexing

- Status: accepted
- Area: GridApi | Selection | Export
- Change:
  - `CellSpanModel.index` was added as a public merge-span index contract.
  - `CellSpanIndex` now exposes anchor-cell, row, column, and sparse covered-coordinate indexes.
  - Merge range expansion now queries indexed span buckets instead of scanning every span.
- Reason: Enterprise merge behavior must remain stable when selection, clipboard, export, hit testing,
  and virtual windows interact with many spans or large server-provided span metadata.
- Impact: Additive API. Existing `CellSpanModel.spans` and `CellSpanModel.byCell` remain available.
- Migration: Existing consumers can keep using `byCell`. New integrations should use
  `getCellSpansForRange()`, `getCellSpansForRow()`, or `getCellSpansForColumn()` for merge-aware
  range/window work.

## 2026-05-14 — Auto row height DOM measurement

- Status: accepted
- Area: GridOptions | Virtualization
- Change:
  - `rowHeight: "auto"` now has a DOM renderer contract for local/client row virtualization.
  - The renderer measures rendered center-pane rows, stores sparse measured heights, and reuses them
    for virtual spacers and `scrollToRow` positioning.
  - Segmented viewport, server, and infinite large-row models continue to require fixed numeric row
    heights for stable 10M to 100M row scrolling.
- Reason: Commercial grids need wrapped-content rows without giving up DOM-bounded rendering, while
  large remote row models cannot hold a full per-row height map in the browser.
- Impact: Additive behavior for existing `rowHeight: "auto"` configs. Remote large-row behavior is
  unchanged.
- Migration: Use `rowHeight: "auto"` only with local/client virtualized grids. Use numeric row
  heights for viewport/infinite/server large-row grids.

## 2026-05-13 — Segmented viewport fixed row height policy

- Status: accepted
- Area: GridOptions | RowModel | Virtualization
- Change:
  - `rowModel: "viewport"` with `virtualization.segmented: true` now requires one consistent fixed
    numeric row height across `viewport.rowHeight`, `virtualization.rowHeight`, and numeric
    `rowHeight`.
  - `rowHeight: "auto"` and row-height callbacks are rejected for segmented viewport grids.
  - The 100M viewport example, docs, and tests no longer expose sparse measured row height inputs for
    segmented viewport scrolling.
- Reason: Enterprise large-scroll row models must map unloaded row positions without a client-side
  per-row height map. This matches commercial grid behavior for viewport/infinite row models.
- Impact: Grids that combined segmented viewport scrolling with auto or callback row heights now fail
  fast instead of producing blank body gaps or unstable bottom-seek behavior.
- Migration: Use fixed numeric row height for 10M to 100M viewport grids. Move long content into
  detail panels, row expansion, side panels, or smaller client/local variable-height grids.

## 2026-05-12 — Row model capability matrix

- Status: accepted
- Area: RowModel | DataSource | GridOptions
- Change:
  - `rowModelCapabilityMatrix` was added as the public source of truth for row model feature support.
  - `getRowModelCapabilityProfile(rowModel)` was added for retrieving one row model profile.
  - `RowModelCapabilityProfile`, `RowModelCapabilityMatrix`, `RowModelCapabilityKey`, and
    `RowModelCapabilitySupport` were added to the public type surface.
  - The docs now include a row model capability matrix for client, infinite, server, viewport, and
    tree row models.
- Reason: Enterprise users need a stable contract that explains which row model owns each feature and
  which capabilities are delegated to the server through `DataSource` requests.
- Impact: Additive API. Existing row model behavior is unchanged.
- Migration: Use `rowModelCapabilityMatrix` in wrapper docs, examples, and integration checks instead
  of duplicating row model capability claims.

## 2026-05-12 — Duplicate row id policy

- Status: accepted
- Area: GridOptions | RowModel | Wrapper
- Change:
  - `GridOptions.duplicateRowKeyPolicy` was added with `"error"` and `"suffix"` policies.
  - Explicit `rowKey` duplicates now fail by default in client, server, viewport, and tree row models.
  - The legacy auto-suffix behavior remains available only with `duplicateRowKeyPolicy: "suffix"`.
  - React and Vue wrappers pass the same option through without wrapper-specific behavior.
- Reason: Selection, editing, merge layout, clipboard, row state restore, and remote transactions require one logical row id to identify one row.
- Impact: Grids that provide duplicate explicit row ids now throw instead of silently creating synthetic ids.
- Migration: Fix source data ids, or explicitly opt in to suffix mode for legacy datasets while planning a data cleanup.

## 2026-05-11 — Client Row Model transaction result contract

- Status: accepted
- Area: GridApi | RowModel | Wrapper
- Change:
  - `ClientRowTransactionResult` and related row/update/reject result types were added.
  - `setClientRowsWithResult()`, `appendClientRowsWithResult()`, `updateClientRowsWithResult()`, and `removeClientRowsWithResult()` were added while keeping the existing store-returning helpers.
  - Client-backed `GridApi.setData()`, `appendRows()`, `updateRows()`, and `removeRows()` now return a transaction result when the mutation is applied synchronously.
  - React and Vue wrappers expose the same return contract through their grid handles.
- Reason: Client row mutations previously swallowed missing keys and duplicate requests, making enterprise audit, toast, rollback, and integration logic unreliable.
- Impact: Additive API with a widened return type from `void` to `ClientRowTransactionResult | undefined`.
- Migration: Existing callers may ignore the return value. Use `result.rejected` and `result.updated/added/removed` when an integration needs precise mutation feedback.

## 2026-05-11 — DataSource error retry status contract

- Status: accepted
- Area: GridOptions | DataSource | Events
- Change:
  - `DataSourceError`, `DataSourceStatusSnapshot`, `DataSourceRetryPolicy`, and related status/request-kind types were added.
  - `GridOptions.dataSourceOptions.retry` was added and is passed to infinite, server, viewport, and lazy tree row models.
  - Core row models now execute `DataSource.getRows()` and lazy `DataSource.getChildren()` through a shared retry/status pipeline.
  - DOM remote row loading, server update transactions, and remote set-filter distinct-value loading now emit standardized DataSource request/error events.
- Reason: Remote row models previously handled errors inconsistently, and retry/status metadata was not available as a public contract.
- Impact: Additive API. Existing DataSource implementations keep working; retry is disabled unless configured.
- Migration: Configure `dataSourceOptions.retry` for transient network/server failures and handle `events.error` for normalized `DataSourceError` payloads.

## 2026-05-11 — Server Row Model route cache

- Status: accepted
- Area: DataSource | GridApi
- Change:
  - `ServerRowModelStateSnapshot.routes` and `ServerRowRouteSnapshot` were added for route-aware cursor persistence.
  - `ServerRowCacheEntry` now exposes `routeKey`, `routePath`, and `page` metadata.
  - `ServerRowModel.loadRoutePage(groupKeys, page, refresh)` was added for explicit route page loading.
  - Server cursor storage is now isolated per `groupKeys` route instead of being root-page-only.
- Reason: Server grouping, infinite route expansion, and saved enterprise views need root and child route pages to cache and restore independently.
- Impact: Additive API. Existing `cursors` snapshots remain as the backward-compatible root route format.
- Migration: Use `rowModelState.routes` when persisting server model state that includes expanded group routes.

## 2026-05-11 — Row model state snapshot restore

- Status: accepted
- Area: GridOptions | GridApi
- Change:
  - `RowModelStateSnapshot` was added to the public type surface.
  - `GridStateSnapshot.rowModelState` now captures row-model-specific runtime state for client, infinite, server, viewport, and tree row models.
  - `GridOptions.initialState.rowModelState` and `GridApi.setState({ rowModelState })` restore append cursors, server page/group expansion/cursors, viewport range metadata, and tree expansion/selection.
- Reason: Large-data row models need a persistence contract that does not overload generic scroll/pagination state or require full client-side row data.
- Impact: Additive API. Data caches are intentionally not serialized; restored remote models re-request data through their configured `DataSource`.
- Migration: Store `api.getState().rowModelState` with `scroll`, `pagination`, `sortModel`, and `filterModel` for saved enterprise views.

## 2026-05-11 — Duplicate explicit column identity validation

- Status: accepted
- Area: ColumnDef | ColumnModel
- Change:
  - Explicit `columnId`, legacy `id`, and legacy `groupId` now share one validated identity namespace.
  - Duplicate explicit identities throw during column model creation instead of being silently suffixed.
  - Blank explicit identities now throw during column model creation.
  - Explicit identities are reserved before field fallback IDs are assigned, independent of column order.
  - Duplicate `field`-only columns remain supported and continue to receive fallback suffixes such as `amount__2`.
- Reason: Enterprise column state, events, wrapper slots, header merge rules, and export/import mappings require explicit column identities to be stable and user-owned.
- Impact: Grids that intentionally reused the same explicit identity must assign distinct `columnId` values.
- Migration: Keep duplicate `field` values if needed, but give each rendered column a unique `columnId`, for example `amount-raw` and `amount-formatted`.

## 2026-05-11 — Column State API maturity

- Status: accepted
- Area: GridApi | ColumnModel | Wrapper | DOM
- Change:
  - `GridApi.getColumnState(options)` now accepts `{ includeDefaults: true }` for a complete leaf-column snapshot.
  - `GridApi.applyColumnState(params, options)` was added for partial column state application.
  - `ApplyColumnStateParams`, `ColumnStateApplyResult`, and `GetColumnStateOptions` were added to the public type surface.
  - Partial apply supports `defaultState`, `applyOrder`, missing-column validation, and opt-in `ignoreMissingColumns`.
  - React and Vue wrappers expose the same method without reimplementing column state logic.
- Reason: Enterprise saved views, per-user preferences, schema evolution, and wrapper parity need a safer incremental state API than whole-state replacement.
- Impact: Additive API. `setColumnState()` remains the replacement API and keeps existing behavior.
- Migration: Use `applyColumnState()` for saved user preferences and keep `setColumnState()` for full controlled replacement.

## 2026-05-11 — Group header child order constraints

- Status: accepted
- Area: ColumnDef | ColumnModel | HeaderModel
- Change:
  - `ColumnGroupDef.marryChildren` is now enforced by the core column order model.
  - `columnOrder`, `columnState.order`, `api.applyColumnState()`, and column move operations keep married group leaves contiguous.
  - Header matrix creation now receives already-constrained leaf order, so a married group does not split into multiple header cells after restore or reorder.
- Reason: Group header contracts must survive saved views and runtime column moves without visually broken group spans.
- Impact: Additive behavior for groups that opted into `marryChildren: true`. Existing groups without the flag keep current reorder behavior.
- Migration: Set `marryChildren: true` only for groups whose children must move as one logical block.

## 2026-05-11 — Header merge rule validation

- Status: accepted
- Area: GridOptions | HeaderModel
- Change:
  - Core now validates `GridOptions.headerMerge.rules` before header matrix rendering.
  - Header merge rules must use unique ids, non-empty names, and leaf data column ids.
  - Structural row merge rules must be contiguous and cannot overlap another structural row rule.
  - Label merge rules must resolve to one existing group or leaf header cell.
  - `validateHeaderMergeRules()`, `assertValidHeaderMergeRules()`, and header merge validation result types are exported from `@onegrid/core`.
- Reason: Invalid header merge rules previously failed silently or split into visually ambiguous cells, which can corrupt pinned clipping, exports, accessibility labels, and saved column-state restore.
- Impact: Invalid header merge configurations now throw during grid/header model creation instead of being ignored.
- Migration: Replace group ids with leaf column ids, split non-contiguous row merges into separate rules, and give repeated header names explicit unique ids.

## 2026-05-11 — Column policy flags

- Status: accepted
- Area: ColumnDef | ColumnModel | GridApi | DOM | Wrapper
- Change:
  - `DataColumnDef.hideable`, `pinnable`, `lockVisible`, `lockPinned`, and `lockPosition` were added.
  - Column menu, columns tool panel, public column APIs, `setColumnState()`, and `applyColumnState()` now honor these flags.
  - Locked column order is preserved during state restore and reorder operations.
  - `resizable: false` continues to block resize and auto-size.
- Reason: Enterprise grids need required columns, fixed-position columns, and locked pinned columns to survive user actions and saved-view restore.
- Impact: Additive API. Columns without these flags keep existing behavior.
- Migration: Use `hideable: false` or `lockVisible: true` for required columns, `lockPinned: true` for mandatory pinned columns, and `lockPosition: true` for fixed-order columns.

## 2026-05-11 — Column group open state

- Status: accepted
- Area: ColumnDef | ColumnModel | GridApi | Wrapper | DOM
- Change:
  - `DataColumnDef.columnGroupShow` and `ColumnGroupDef.columnGroupShow` were added with `"always"`, `"open"`, and `"closed"` visibility modes.
  - `ColumnGroupDef.openByDefault` is now consumed by the column model instead of remaining a type-only option.
  - `ColumnUiState.groups` stores persisted group open state by group `columnId`.
  - `GridApi.setColumnGroupOpen()` and `GridApi.toggleColumnGroup()` were added and exposed through React and Vue wrappers.
  - `applyColumnState()` validates group ids and reports `appliedGroupIds` / `missingGroupIds`.
- Reason: Group header open/closed behavior must be stateful, restorable, and wrapper-parity before header features can be considered structurally complete.
- Impact: Additive API. Existing groups without `columnGroupShow` render the same in open and closed states.
- Migration: Use `columnGroupShow: "open"` for detail columns and `"closed"` for compact summary columns under the same group.

## 2026-05-08 — Column defaults and reusable column types

- Status: accepted
- Area: GridOptions | ColumnDef | Wrapper | DOM
- Change:
  - `GridOptions.defaultColumnDef` was added for shared leaf-column defaults.
  - `GridOptions.columnTypes` was added as a named registry of reusable column profiles.
  - `DataColumnDef.type` now accepts custom type names and ordered type arrays.
  - `DataColumnDefaults`, `ColumnTypeDef`, `ColumnTypeRegistry`, `ColumnTypeName`, and `ColumnTypeReference` were added to the public type surface.
  - React and Vue wrappers pass the same options through without reimplementing column resolution.
- Reason: Enterprise grids need AG/TUI-style reusable column contracts for common width, filter, editor, formatter, renderer, and SI project defaults.
- Impact: Additive API. Existing built-in `type` values continue to work.
- Migration: Move repeated column properties into `defaultColumnDef` or named `columnTypes`; explicit column properties continue to override inherited defaults.

## 2026-05-08 — Public cancellable before-events

- Status: accepted
- Area: GridOptions | GridApi | Events | Wrapper | DOM
- Change:
  - `GridBeforeEventMap`, `GridBeforeEventHandlers`, `GridBeforeEventHandler`, and `GridCancellableEvent` were added to the public type surface.
  - `GridOptions.beforeEvents` was added for constructor-time cancellable hooks.
  - `GridApi.onBefore()` and `GridApi.offBefore()` were added and bridged through React refs and Vue exposes.
  - React props such as `onBeforeSortChange` and Vue emits such as `beforeSortChange` mirror the shared before-event names.
  - DOM cancellation is wired before edit start, edit commit, selection, sorting, filtering, pagination, and column state mutations.
- Reason: Enterprise integrations need a public, wrapper-parity way to block grid mutations for permissions, dirty-state guards, workflow gates, and required-column policies.
- Impact: Additive API. Normal `events.*` still fire only after a successful mutation.
- Migration: Use `beforeEvents` or `api.onBefore()` when a handler must prevent default grid behavior. Keep `events` for after-the-fact notifications and audit.

## 2026-05-08 — Column state API

- Status: accepted
- Area: GridApi | Wrapper
- Change:
  - `ColumnUiState` now has a shared `SetColumnStateOptions` companion contract.
  - `GridApi.getColumnState()`, `GridApi.setColumnState()`, and `GridApi.resetColumnState()` were added.
  - React refs and Vue exposes delegate the same methods to the DOM grid.
- Reason: Column width, visibility, pinning, and order need a direct persistence API instead of relying only on constructor options or full grid state snapshots.
- Impact: Additive API. Existing `columnState`, `initialState.columnState`, and column menu APIs remain supported.
- Migration: Use `getColumnState()` for saved column views, `setColumnState()` for restore, and `resetColumnState()` to return to `GridOptions.columnState`.

## 2026-05-08 — Runtime state snapshot contract

- Status: accepted
- Area: GridOptions | GridApi | Wrapper
- Change:
  - `GridStateSnapshot`, `SetGridStateOptions`, and `GRID_STATE_SNAPSHOT_VERSION` were added to the public type surface.
  - `GridOptions.initialState` restores column UI state, sort/filter/group models, selection, pagination, scroll offsets, and locale on first render.
  - `GridApi.getState()` and `GridApi.setState()` are available through vanilla DOM, React refs, and Vue exposes.
- Reason: Phase 2 contract hardening needs a column-id-safe, wrapper-parity state persistence API before later feature phases add more mutable state.
- Impact: Additive API. Existing `columnState`, sorting, filtering, grouping, selection, and pagination options remain supported.
- Migration: Prefer `initialState` plus `getState()`/`setState()` for saved views. Keep static structure such as `columns`, `dataSource`, and security options in `GridOptions`.

## 2026-05-08 — Column identity contract

- Status: accepted
- Area: ColumnDef | GridApi | Events | Wrapper
- Change:
  - `ColumnId` and `ColumnKey` were added to the public type surface.
  - `DataColumnDef.columnId` and `ColumnGroupDef.columnId` were added as canonical column identifiers.
  - Legacy `DataColumnDef.id` and `ColumnGroupDef.groupId` remain supported as compatibility aliases.
  - `CellContext`, `CellPosition`, selection, context menu, and edit event payloads now carry `columnId` where a rendered column is known.
  - `SortModel` and `FilterCondition` now accept optional `columnId` for client-side column resolution while preserving `field` as the data/request key.
  - React and Vue renderer slot lookup now resolves `columnId` before legacy ids and field names.
- Reason: Enterprise features need a stable UI/API column identity that is independent from data `field`, especially for duplicate-field, valueGetter, generated, grouped, and pivot columns.
- Impact: Additive API. Existing field-based calls continue to resolve as a compatibility fallback.
- Migration: Prefer `columnId` for column state, header merge rules, menu actions, wrapper slots, and `GridApi` column methods. Keep `field` for row data binding, sorting/filtering request fields, and import/export data keys.

## 2026-05-08 — Fieldless data columns

- Status: accepted
- Area: ColumnDef | ColumnModel | Sorting | Filtering | Editing | Wrapper
- Change:
  - `DataColumnDef.field` is now optional.
  - Fieldless columns resolve identity from `columnId`, `id`, or a stable model fallback.
  - Client sorting and filtering can resolve fieldless `valueGetter` columns through `columnId`.
  - Editing no longer writes back to a synthetic field when a fieldless column has no `valueSetter`.
  - React and Vue renderer slot bridges fall back to `headerName` only after `columnId`, `id`, and `field`.
- Reason: Enterprise grids need generated columns, action columns, checkbox-only columns, row-number columns, and `valueGetter` columns without forcing fake data fields.
- Impact: Additive API. Existing columns with `field` keep the same behavior.
- Migration: For fieldless columns, provide `columnId` and use `valueGetter`, `renderer`, or `valueSetter` for data-specific behavior.

## 2026-05-07 — Edit undo and redo stack

- Status: accepted
- Area: GridOptions | GridApi | Events | Wrapper
- Change:
  - `EditingOptions.undoRedo` was added with `enabled` and `limit` controls.
  - `GridApi.undoEdit()`, `redoEdit()`, `getEditHistoryState()`, and `clearEditHistory()` were added.
  - `GridEditHistoryEntry` and `GridEditHistoryState` were added to the public type surface.
  - `editUndo`, `editRedo`, and `editHistoryChanged` events were added and bridged through React/Vue.
- Reason: Enterprise editing needs reversible staged and committed cell edits without reviving full row editing.
- Impact: Additive API. The stack stores bounded row snapshots and is cleared by external data replacement APIs.
- Migration: Use `editing.undoRedo: false` to disable the stack or set `editing.undoRedo.limit` for memory-sensitive grids.

## 2026-05-07 — Read-only edit requests for external state

- Status: accepted
- Area: GridOptions | Events | Wrapper
- Change:
  - `EditingOptions.readOnly` was added.
  - `cellEditRequested` was added and bridged through React/Vue.
  - Read-only edit requests include `previousValue`, `nextValue`, `nextRow`, and `trigger`.
- Reason: Controlled applications need the grid to validate and request edits without mutating internal row data.
- Impact: Additive API. `commitMode: "cell"` and `commitMode: "batch"` continue to work when `readOnly` is not enabled.
- Migration: Use `editing.readOnly: true` when React, Vue, or an external store owns row state. Handle `cellEditRequested` and feed accepted rows back via `setData`, `updateRows`, or framework props.

## 2026-05-07 — Batch edit session API

- Status: accepted
- Area: GridApi | Events | Wrapper
- Change:
  - `GridApi.startBatchEditSession()`, `getBatchEditSession()`, `commitBatchEditSession()`, and `cancelBatchEditSession()` were added.
  - `GridBatchEditSession` and `StartBatchEditSessionOptions` were added to the public type surface.
  - `batchEditSessionStarted`, `batchEditSessionCommitted`, and `batchEditSessionCancelled` events were added and bridged through React/Vue.
- Reason: Batch editing needs a named lifecycle boundary for audit, toolbar state, SI workflow integration, and wrapper parity.
- Impact: Additive API. Existing `getPendingEdits()`, `commitPendingEdits()`, and `cancelPendingEdits()` continue to work.
- Migration: Prefer the session methods for new batch-edit workflows. Existing pending-edit integrations do not need to change.

## 2026-05-07 — Editing keyboard policy

- Status: accepted
- Area: GridOptions | Events
- Change:
  - `EditingOptions.keyboard` was added with explicit Tab, Enter, Escape, and Backspace policy flags.
  - `EditCommitTrigger` now includes `tab` for editor Tab commits.
- Reason: Editing key behavior must be documented and configurable instead of being an implicit DOM-only convention.
- Impact: Additive API. Defaults preserve current enterprise grid behavior: Enter starts/commits, Tab commits and moves, Escape cancels, and Backspace clears then starts editing.
- Migration: Event consumers that exhaustively switch on `cellEditStaged.trigger` or `cellEditCommitted.trigger` should handle `tab`.

## 2026-05-07 — Editing start mode and column edit trigger

- Status: accepted
- Area: GridOptions | ColumnDef
- Change:
  - `EditingOptions.startMode` was added with `doubleClick`, `singleClick`, and `manual`.
  - `ColumnDef.editTrigger` was added as a column-level override for the same pointer edit policy.
  - Checkbox editor columns default to `singleClick` when no explicit grid or column policy is supplied.
- Reason: Enterprise grids need a documented pointer edit policy instead of hard-coded checkbox-only click behavior.
- Impact: Additive API. Existing grids keep double-click editing for regular cells and single-click checkbox toggles.
- Migration: None. Use `editing.startMode: "singleClick"` for Excel-like click editing or `editTrigger: "manual"` to suppress pointer-started editing on specific columns.

## 2026-05-07 — Pointer edit trigger for inline checkbox editing

- Status: accepted
- Area: Events
- Change:
  - `EditCommitTrigger` now includes `pointer`.
  - DOM checkbox editors toggle inline on a primary single click and emit staged/committed edit events with `trigger: "pointer"`.
- Reason: Boolean checkbox cells should behave like standard enterprise grid checkbox cells without requiring a double-click editor overlay.
- Impact: Additive event trigger value. Existing `enter`, `blur`, and `api` handling remains unchanged.
- Migration: Event consumers that exhaustively switch on `cellEditStaged.trigger` or `cellEditCommitted.trigger` should handle `pointer`.

## 2026-05-04 — Framework wrapper API parity contract

- Status: accepted
- Area: GridOptions | GridApi | Events | Wrapper
- Change:
  - `@onegrid/core` now exports `gridOptionParityKeys`, `gridEventParityNames`, and `gridApiMethodParityNames`.
  - DOM, React, and Vue expose the same GridOptions keys, event names, and GridApi method names.
  - React `OneGridHandle<TData>` and Vue `OneGridExpose` now extend the shared `GridApi` method surface.
  - Wrapper parity is documented in `frameworks/api-parity` and enforced by unit tests.
- Reason: WRAP-003 requires JS/React/Vue option, event, and method parity before deeper wrapper API work.
- Impact: No breaking change for existing wrapper consumers. Previously missing wrapper methods are additive.
- Migration: Use the same method names from vanilla grid instances, React refs, and Vue template refs.

## 2026-05-04 — SI design token theme builder

- Status: accepted
- Area: Theme
- Change:
  - `@onegrid/themes` now exports `createSiTheme()` and `siTokenMappings`.
  - SI token groups (`colors`, `typography`, `shadows`) map to scoped OneGrid CSS variables.
  - `createSiTheme()` returns the same `theme` shape consumed by DOM, React, and Vue.
- Reason: THEME-002 requires SI design-token mapping, a theme builder example, CSS override guidance, and visual coverage per tenant theme.
- Impact: No breaking change. Existing `theme.variables` usage remains valid.
- Migration: Projects with existing design systems can replace hand-written `theme.variables` objects with `createSiTheme({ tokens })`.

## 2026-05-04 — Theme foundation presets and density runtime

- Status: accepted
- Area: GridOptions | GridApi | Theme
- Change:
  - `@onegrid/themes` now exports semantic CSS tokens plus `default`, `clean`, `compact`, `dark`, and `high-contrast` stylesheet entry points.
  - DOM theme runtime maps `theme.name` to `data-og-theme` and `theme.density` to `data-og-density`.
  - `GridApi.applyTheme()` switches theme name, density, custom class, and scoped CSS variables without remounting.
- Reason: THEME-001 requires default, clean, compact, dark, high-contrast, density, runtime switching, and scoped theme support from one shared contract.
- Impact: No breaking change. Existing `@onegrid/themes/default.css` import remains valid.
- Migration: Use `theme: { name: "dark", density: "compact" }` for built-in runtime themes, or import variant CSS files directly for static application-wide themes.

## 2026-05-04 — XSS renderer security contract

- Status: accepted
- Area: GridOptions | ColumnDef | Security
- Change:
  - `ColumnDef.renderer.kind: "html"` remains an explicit opt-in path and now uses the audited DOM HTML security boundary.
  - `GridOptions.security.html.trustedTypesPolicyName` is consumed when the browser exposes Trusted Types.
  - Element renderer URL attributes are filtered through `GridOptions.security.url.allowedProtocols`.
  - `@onegrid/dom` exports `strictTextOnlySanitizer` for deployments that want HTML renderer content reduced to text.
- Reason: SEC-002 requires default text escaping, sanitizer-backed HTML rendering, Trusted Types support, and URL protocol allowlisting.
- Impact: Unsafe `href`, `src`, `action`, `formaction`, `poster`, `cite`, and `background` attribute values are dropped from element renderers. Inline event attributes, inline style attributes, `srcdoc`, and `srcset` are dropped.
- Migration: Use `kind: "text"` or `kind: "element"` for most cells. For HTML rendering, provide `security.html.allowHtmlRenderer: true`, a sanitizer, and an optional Trusted Types policy name.

## 2026-05-04 — CSP runtime style controls

- Status: accepted
- Area: GridOptions | Security | Theme | Wrapper
- Change:
  - `GridOptions.security.csp.nonce` is now consumed by the DOM runtime style injector.
  - `GridOptions.security.csp.disableStyleInjection` disables scoped runtime theme variable injection.
  - DOM `OneGrid.applyTheme()` applies scoped theme variables through the same nonce-aware path.
  - Vue wrapper now accepts the shared `theme` prop and exposes `applyTheme()`.
- Reason: SEC-001 requires strict CSP support without `unsafe-inline`, `eval`, `new Function`, or wrapper-specific theme behavior.
- Impact: No breaking change. Existing static theme CSS remains the default path.
- Migration: Provide `security.csp.nonce` when using runtime `theme.variables`, or use `disableStyleInjection` with static CSS variables.

## 2026-04-29 — Cell merge layout contract

- Status: accepted
- Area: GridOptions | ColumnDef | DataSource | Wrapper
- Change:
  - `GridOptions.merge.fields`, `GridOptions.merge.columnIds`, and `GridOptions.merge.getSpan(context)` were added.
  - `ColumnDef.merge` is now consumed by the core `CellSpanModel`.
  - `GetRowsResult.mergeMeta[].value` was added for server-owned clipped merge rendering.
  - Vue wrapper accepts the shared `merge` prop.
- Reason: LAY-004 requires a core-owned merge/span contract before selection, editing, clipboard, export, and virtualization can share anchor resolution.
- Impact: `GridOptions.merge.getSpan` now receives a typed cell context instead of positional arguments.
- Migration: update `getSpan(row, field, rowIndex)` callbacks to `getSpan(({ row, field, rowIndex }) => ...)`.

## 2026-04-29 — Accessibility grid options

- Status: accepted
- Area: GridOptions | Wrapper
- Change:
  - `GridOptions.accessibility.label`, `description`, and `liveRegion` were added.
  - Vue wrapper accepts the shared `accessibility` prop.
- Reason: DOM-003 requires grid labeling, screen-reader description, and live region behavior to be configured through the shared core contract instead of wrapper-only APIs.
- Impact: No migration impact. The DOM renderer falls back to `OneGrid data grid` and a polite live region when no accessibility option is supplied.
- Migration: None.

## 2026-04-29 — Sorting model and comparator contract

- Status: accepted
- Area: GridOptions | ColumnDef | GridApi | Events
- Change:
  - `GridOptions.sorting.sortOrder` was added for header sort cycling.
  - `ColumnDef.sortComparator` was added for column-specific client sorting.
  - DOM `OneGrid` now implements `setSortModel()` and `getSortModel()`.
  - Header sorting emits the existing `sortChanged` event.
- Reason: F-SORT requires one shared sorting contract for client, infinite, server, viewport, DOM, React, and Vue entry points.
- Impact: No breaking change. Existing static `sorting.model` continues to work.
- Migration: None.

## 2026-04-29 — Filtering model and menu contract

- Status: accepted
- Area: GridOptions | ColumnDef | DataSource | GridApi | Events
- Change:
  - `GridOptions.filtering.quickFilter` was added for the DOM quick filter toolbar.
  - `ColumnDef.filter` now accepts `FilterOptions` with `values`, `serverOnly`, and custom `predicate`.
  - DOM `OneGrid` now implements `setFilterModel()` and `getFilterModel()`.
  - Column filter changes emit the existing `filterChanged` event.
  - `DataSource.getDistinctValues()` is used by set filter menus when available.
- Reason: F-FILTER requires one shared filtering contract across client and remote row models without wrapper-specific reimplementation.
- Impact: No breaking change. Existing static `filtering.model` and string filter kinds continue to work.
- Migration: None.

## 2026-04-29 — Editing lifecycle and editor options

- Status: accepted
- Area: GridOptions | ColumnDef | GridApi | Events | Wrapper
- Change:
  - `EditorDef.options` and `EditorOption` were added for select, multi-select, radio, and autocomplete editors.
  - Core exports `startCellEdit`, `commitCellEdit`, `cancelCellEdit`, `isCellEditable`, and `resolveEditorDef`.
  - DOM `OneGrid` now implements `startEdit()` and `stopEdit()` with commit, cancel, validation, and editor overlay behavior.
  - Vue wrapper accepts the shared `editing` prop and exposes `startEdit()` / `stopEdit()`.
- Reason: F-EDIT requires one shared editing lifecycle across core, DOM, React, Vue, examples, and tests without wrapper-specific reimplementation.
- Impact: No breaking change. Existing `ColumnDef.editor` string values remain valid.
- Migration: None.

## 2026-04-29 — Selection state and server token contract

- Status: accepted
- Area: GridOptions | GridApi | Events | Wrapper
- Change:
  - `GridOptions.selection.selectAll` and `serverSelectionToken` were added.
  - Core exports `GridSelectionState`, `SelectedCell`, `SelectedRange`, and server token helpers.
  - DOM `OneGrid` now implements row, cell, range, visible-row, and server-dataset selection methods.
  - `selectionChanged` now includes cells, ranges, and optional server dataset token.
  - Vue wrapper accepts the shared `selection` prop and exposes the DOM selection methods.
- Reason: F-SELECT requires one shared selection contract before clipboard, export, grouping, and merge-aware range workflows build on it.
- Impact: Existing row selection APIs remain valid. Consumers reading `selectionChanged` can optionally use the new payload fields.
- Migration: None.

## 2026-04-30 — Editing commit timing policy

- Status: accepted
- Area: GridOptions | Events | DOM
- Change:
  - `GridOptions.editing.blurAction` was added with `commit` and `cancel` modes.
  - `GridOptions.editing.commitMode` was added with `cell` and `batch` modes.
  - `GridApi.getPendingEdits()`, `GridApi.commitPendingEdits()`, and `GridApi.cancelPendingEdits()` were added for batch editing.
  - `cellEditStaged` was added so accepted editor values can be observed before final batch commit.
  - `cellEditCommitted` now includes `trigger` (`enter`, `tab`, `blur`, `pointer`, or `api`).
  - `cellEditCancelled` now includes `reason` (`escape`, `blur`, `api`, or `replace`).
- Reason: F-EDIT needs commit timing to be explicit so focus changes do not silently persist edits unless the application opts into blur commit.
- Impact: `commitOnBlur` remains supported as a legacy boolean alias. `commitMode` defaults to `cell` for existing behavior.
- Migration: Use `editing.blurAction: "cancel"` and `editing.commitMode: "batch"` when edits should remain pending until an explicit UI commit action.

## 2026-04-30 — Clipboard copy and paste contract

- Status: accepted
- Area: GridOptions | GridApi | Wrapper
- Change:
  - Core now exports text/plain TSV clipboard serialization, parsing, and paste planning helpers.
  - DOM `OneGrid` now implements `copyToClipboard()` and `pasteFromClipboard()` with selection, editing validation, and merge anchor handling.
  - Vue wrapper accepts the shared `clipboard` prop and exposes `copyToClipboard()` / `pasteFromClipboard()`.
- Reason: F-CLIP requires clipboard behavior to use the same selection, merge, and editing contracts instead of DOM-only ad hoc copy/paste.
- Impact: No breaking change. Clipboard is opt-in with `GridOptions.clipboard.enabled: true`.
- Migration: None.

## 2026-04-30 — Menu and context menu contract

- Status: accepted
- Area: GridOptions | Wrapper | DOM
- Change:
  - `GridOptions.contextMenu` was added with `enabled`, `defaultItems`, and custom `items`.
  - Core exports `ContextMenuContext`, `ContextMenuItemDef`, `ContextMenuOptions`, and `createContextMenuModel()`.
  - DOM `OneGrid` now opens cell context menus from right click, `Shift+F10`, or the Context Menu key.
  - Vue wrapper accepts the shared `contextMenu` prop.
- Reason: F-MENU requires header, column, filter, and context menus to share one model and overlay/focus behavior without wrapper-specific reimplementation.
- Impact: No breaking change. Context menus are opt-in with `GridOptions.contextMenu.enabled: true`.
- Migration: None.

## 2026-04-30 — Summary and aggregate mapping

- Status: accepted
- Area: GridOptions | ColumnDef | DataSource | Wrapper
- Change:
  - `SummaryDef.aggregateKey` was added to map summary cells to server-supplied aggregate values.
  - `SummaryDef.label` was added to render clear labels inside summary cells.
  - DOM summary rows now support `summary.position: "top" | "bottom" | "both"`.
  - Client summaries are calculated from the filtered row set.
  - Server row model summary cells can render values returned from `GetRowsResult.aggregate.values`.
- Reason: F-SUMMARY requires top/bottom summary rows, built-in summaries, custom summaries, group aggregates, and server aggregate display to share one contract.
- Impact: No breaking change. Existing `ColumnDef.summary` string values continue to work.
- Migration: None.

## 2026-04-30 — Row grouping runtime contract

- Status: accepted
- Area: GridOptions | DataSource | GridApi | Wrapper
- Change:
  - `GroupingOptions.footer` was added with `"none"` and `"bottom"` modes.
  - `GridApi.setGroupModel()`, `getGroupModel()`, `expandGroup()`, `collapseGroup()`, and `toggleGroup()` were added.
  - `GroupMeta` now accepts optional `field`, `value`, `aggregateValues`, and `footer` metadata for server-rendered group rows and footers.
  - Vue wrapper exposes the shared group runtime methods.
- Reason: F-GROUP requires grouping, expand/collapse, group aggregate rows, group footer rows, and server grouping to share one API contract.
- Impact: No breaking change. Existing static `grouping.model` continues to work.
- Migration: None.

## 2026-04-30 — Tree runtime contract

- Status: accepted
- Area: GridOptions | DataSource | GridApi | Wrapper | Accessibility
- Change:
  - `TreeOptions.treeColumnField`, `filterPolicy`, and `sortPolicy` were added.
  - `GetChildrenRequest` now carries optional `sortModel` and `filterModel`.
  - `TreeRowEntry.selectionState` was added for checked, unchecked, and mixed checkbox states.
  - `GridApi.expandTreeNode()`, `collapseTreeNode()`, `toggleTreeNode()`, `selectTreeNode()`, and `getTreeSelection()` were added.
  - DOM tree grids now use ARIA `treegrid` role and expose expand/collapse buttons on the configured tree column.
  - Vue wrapper exposes the shared tree runtime methods.
- Reason: F-TREE requires tree columns, lazy/server child loading, cascade checkbox selection, and hierarchy-preserving filter/sort policies to share one public contract.
- Impact: Tree row model roots are announced as `treegrid` instead of plain `grid`. Tests and assistive technology should use treegrid semantics for tree examples.
- Migration: None for non-tree grids.

## 2026-04-30 — Pivot model and panel contract

- Status: accepted
- Area: GridOptions | DataSource | Wrapper | DOM
- Change:
  - `PivotModel.values` now accepts strings or value descriptors with `field`, `function`, `alias`, and `label`.
  - `PivotModel.totals` and `PivotModel.subtotals` were added for grand total and subtotal output.
  - `PivotOptions.panel` was added for the DOM pivot panel foundation.
  - Core exports `createClientPivotModel()` and pivot result metadata.
  - DOM client pivot renders generated grouped columns and pivot rows through the normal grid renderer.
  - Server pivot continues to forward `pivotModel` through `DataSource.getRows()`.
- Reason: F-PIVOT requires row fields, column fields, value fields, totals, subtotals, server pivot, and a panel foundation to share one public model.
- Impact: Existing `values: ["amount"]` remains valid and defaults to sum aggregation.
- Migration: Use value descriptors when a pivot value needs a custom aggregate, alias, or label.

## 2026-04-30 — Pagination contract

- Status: accepted
- Area: GridOptions | DataSource | GridApi | Events | Wrapper | DOM
- Change:
  - `PaginationOptions.pageGroupSize` and `cursor` were added.
  - `GridApi.setPageSize()` and `getPageSize()` were added alongside existing page methods.
  - `DataSource.getRows()` now receives cursor pagination metadata and can return `nextCursor` / `hasMore`.
  - DOM renders top, bottom, or both pagination toolbars with page group navigation and page size selection.
  - Vue wrapper accepts the shared `pagination` prop and exposes page methods.
- Reason: F-PAGE requires client, server, cursor, and append-scroll pagination to share one model and renderer contract.
- Impact: No breaking change. Pagination is opt-in with `GridOptions.pagination`.
- Migration: None.

## 2026-05-02 — Frozen rows and columns layout contract

- Status: accepted
- Area: GridOptions | Wrapper | DOM
- Change:
  - `GridOptions.frozenRows.top` and `frozenRows.bottom` are now consumed by the DOM renderer.
  - `GridOptions.frozenColumns.left/right` initialize the shared column state pinned panes.
  - Vue wrapper accepts the shared `frozenRows` and `frozenColumns` props.
  - DOM renders top and bottom frozen rows as separate rowgroup sections with merge clipping and keyboard focus participation.
- Reason: F-FROZEN requires pinned columns, top/bottom frozen rows, virtualization, merge, and keyboard navigation to share one layout contract.
- Impact: No breaking change. Frozen rows and columns are opt-in.
- Migration: None.

## 2026-05-02 — Export and import API contract

- Status: accepted
- Area: GridOptions | GridApi | Wrapper | DOM | Core
- Change:
  - `GridOptions.import` was added and `GridOptions.export` now includes CSV/XLSX/PDF/JSON/print options.
  - `ImportOptions.mode` was added with default `"replace"` and opt-in `"append"`.
  - `ImportOptions.headerRowCount` was added for importing visual exports with multi-row merged headers.
  - `GridApi.importData(content, options)` was added alongside `GridApi.exportData(options)`.
  - Core exports converters for CSV, dependency-free XLSX OpenXML, lightweight PDF, print HTML, JSON, and typed import row parsing.
  - DOM export/import uses visible rows, header merge, cell merge, and selected range state without wrapper reimplementation.
- Reason: F-EXPORT requires export/import behavior to be shared by core, DOM, React, and Vue.
- Impact: No breaking change. Export and import are opt-in public methods. Import replaces existing client rows by default.
- Migration: None.

## 2026-05-04 — Localization registry and formatter bridge

- Status: accepted
- Area: GridOptions | GridApi | Wrapper | DOM | Core
- Change:
  - Core exports locale definitions, `registerLocale()`, `getLocale()`, `listLocales()`, and `createLocaleFormatter()`.
  - `CellContext` now includes `locale`, `formatNumber()`, and `formatDate()`.
  - DOM footer, overlays, pagination, ARIA live regions, and formatter calls consume the active locale.
  - `GridApi.setLocale()` and `getLocale()` were added for runtime locale switching.
  - Vue wrapper accepts the shared `locale` prop and exposes locale methods.
- Reason: F-I18N requires renderer chrome and user formatter callbacks to share one locale contract across vanilla, React, and Vue.
- Impact: Custom `CellContext` objects in tests or external helpers must provide the locale formatter bridge.
- Migration: Use `createLocaleFormatter()` when constructing `CellContext` manually.

## 2026-05-04 — React wrapper lifecycle and renderer bridge

- Status: accepted
- Area: React | GridOptions | Wrapper | DOM | Core
- Change:
  - `@onegrid/react` exposes `<OneGrid />` as a `forwardRef` component with a typed `OneGridHandle`.
  - React event props such as `onReady`, `onSelectionChanged`, `onSortChanged`, and editing events are merged with core `GridOptions.events`.
  - `reactRenderers.cells` and `reactRenderers.headers` mount React nodes through the existing safe element-renderer path.
  - `DataColumnDef.headerRenderer` was added so leaf headers and group headers share the same header renderer contract.
- Reason: WRAP-001 requires React to be a lifecycle, ref, event, and renderer bridge without reimplementing core or DOM grid behavior.
- Impact: React renderer slots are opt-in and use React DOM rendering. Untrusted HTML must still go through OneGrid sanitizer or React-safe text rendering.
- Migration: None.

## 2026-05-04 — Vue wrapper expose, emit, and slot bridge

- Status: accepted
- Area: Vue | GridOptions | Wrapper | DOM
- Change:
  - `@onegrid/vue` exposes `OneGridExpose` and `OneGridProps` types.
  - Vue emits now mirror shared grid events such as `ready`, `selectionChanged`, `sortChanged`, and editing events.
  - The Vue wrapper accepts shared `events` and `plugins` props and chains core event handlers before component emits.
  - Vue `#cell-*` and `#header-*` slots mount through the existing safe element-renderer path.
  - Direct `width`, `height`, `bodyHeight`, and `headerHeight` props were added to the Vue bridge for GridOptions parity.
- Reason: WRAP-002 requires Vue to be a lifecycle, expose, event, and slot bridge without reimplementing core or DOM grid behavior.
- Impact: Vue slot renderers are opt-in. Editor UI still uses the shared `EditorDef` and DOM editor overlay.
- Migration: None.

## 2026-05-07 — Editing remains cell-scoped with keyboard movement

- Status: accepted
- Area: GridOptions | GridApi | Events | Wrapper | DOM
- Change:
  - Full row editing candidate APIs and events were removed before promotion to the public contract.
  - `GridApi.startEdit()` / `stopEdit()`, batch pending edits, and batch edit sessions remain the supported editing API surface.
  - Keyboard navigation now scrolls the body viewport when the next focused center cell is outside the visible area.
  - React and Vue wrappers expose the same cell-scoped editing methods and events as vanilla DOM.
- Reason: Editing one cell, committing with Tab, and continuing across the row is more predictable than opening all row editors at once, especially with pinned panes, horizontal scroll, native select/date/radio controls, and batch commit flows.
- Impact: No released API breaking change. Consumers experimenting with unreleased row-edit candidate methods should use cell editing plus batch sessions or an external row form.
- Migration: Use `editing.keyboard.tab: "commitMove"` with `editing.commitMode: "batch"` when users should edit across a row and commit changes explicitly.

## 2026-05-08 — Plugin extension points

- Status: accepted
- Area: GridOptions | GridApi | Plugin | DOM | Wrapper
- Change:
  - `GridPluginContext.registerExtension()` and `getExtensions()` were added for lifecycle-bound extension contributions.
  - `GridApi.hasPlugin()` and `getPluginExtensions()` expose plugin availability and extension metadata to vanilla, React, and Vue.
  - Core plugin registry now owns a duplicate-safe extension registry and removes plugin contributions during cleanup.
  - `menu.header` and `menu.context` extension payloads are rendered by the DOM header and context menu runtimes.
  - `export.adapter` extensions can provide custom export formats after DOM export matrix generation.
  - `theme` extensions merge theme variables/options before the CSP-aware runtime style application.
  - DOM `OneGrid` now sets up `GridOptions.plugins` before first render and disposes plugin cleanup handlers during `destroy()`.
- Reason: plugin integrations need stable extension points for menus, render adapters, export/import adapters, themes, and future enterprise hooks without wrapper-specific reimplementation.
- Impact: No breaking change. Extension payloads are metadata or adapter hooks and do not bypass renderer security, CSP, or sanitizer policy.
- Migration: Existing plugins can keep using `addCleanup()` and `onDispose()`; use `registerExtension()` for discoverable contributions.

## 2026-05-15 — Export/import adapter hardening

- Status: accepted
- Area: Export | Import | Plugin | Adapters | DOM
- Change:
  - `ImportOptions.format` now accepts custom format strings so import adapters can own non-core formats.
  - Core exports `GridImportAdapterPayload`, `GridImportAdapterContext`, and shared adapter capability metadata.
  - DOM `GridApi.importData()` now consumes `import.adapter` extensions before falling back to the dependency-free built-in importer.
  - Built-in `createGridExport()` and `createGridImport()` reject unknown formats without an explicit adapter instead of silently treating them as CSV.
  - `@onegrid/adapters` exports `createGridIoAdapterPlugin()`, `createExportAdapterPlugin()`, and `createImportAdapterPlugin()` helper factories.
- Reason: Korean/CJK PDF font embedding and arbitrary external XLSX compatibility require a stable adapter boundary without adding document-engine dependencies to `@onegrid/core`.
- Impact: No breaking change for built-in `csv`, `xlsx`, `pdf`, `json`, and `print` usage. Direct core calls with unknown custom formats must now register/use an adapter at the DOM/plugin boundary.
- Migration: Package enterprise PDF/XLSX engines as `export.adapter` or `import.adapter` plugins and pass them through `GridOptions.plugins`.

## 2026-05-15 — Pivot and grouping UX maturity

- Status: accepted
- Area: Grouping | Pivot | DOM | Examples | Docs
- Change:
  - Group rows now render a stable group label plus separate aggregate chips instead of one long aggregate string.
  - The grouping example exposes client expand-all, collapse-all, reset, and server route state controls.
  - Pivot toolbar text changed to `Pivot fields`, and the panel now shows client/server runtime mode, row/column/value buckets, totals, and runtime metadata.
  - Full row editing remains excluded; this UX pass does not reintroduce row-wide editor APIs.
- Reason: Grouping and pivot need inspectable enterprise UX, not only internal model correctness.
- Impact: Existing pivot panels remain opt-in through `pivot.panel: true`. Tests and docs should target `Pivot fields` for the toolbar label.
- Migration: If an app selected the old `Pivot` button text in tests, update selectors to `Pivot fields`.

## 2026-05-15 — Export and clipboard spreadsheet hardening

- Status: accepted
- Area: Export | Clipboard | Security
- Change:
  - CSV export now neutralizes formula-like string cells by prefixing an apostrophe at the delimited text boundary.
  - Clipboard TSV copy uses the same neutralization before writing `text/plain`.
  - XLSX export is covered by regression tests to keep formula-like values as inline strings rather than formula cells.
- Reason: CSV and TSV are often opened or pasted into spreadsheet tools, where leading `=`, `+`, `-`, or `@` strings can be interpreted as formulas.
- Impact: Grid source data is not mutated. Delimited text handoff may contain a leading apostrophe for formula-like strings so spreadsheet tools display them as text.
- Migration: Applications that intentionally export executable formulas should provide an audited custom export adapter and keep that behavior explicit.
