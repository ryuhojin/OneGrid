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
  - `cellEditCommitted` now includes `trigger` (`enter`, `blur`, or `api`).
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
