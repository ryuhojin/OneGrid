# ARCHITECT.md — OneGrid 아키텍처 설계서

> 제품명: OneGrid  
> 목표 버전: 1.0 Enterprise Release  
> 대상 환경: HTML/JavaScript, TypeScript, React, Vue, CDN, npm  
> 비대상: RTL 지원은 1.0 범위에서 제외

---

## 1. 아키텍처 목표

OneGrid는 금융·공공 SI 프로젝트에서 사용할 수 있는 엔터프라이즈급 프론트엔드 그리드 라이브러리다.

핵심 목표:

1. HTML/JS, React, Vue에서 동일한 기능과 API 제공
2. Client Mode와 Server Mode 동시 지원
3. 10M ~ 100M rows를 서버/뷰포트 기반으로 탐색 가능한 성능 제공
4. header merge, group header, cell merge를 최초 설계부터 포함
5. 필터, 정렬, 편집, 요약, 그룹핑, 트리, 피벗, 페이지네이션, 컨텍스트 메뉴, 헤더 메뉴 등 상용 그리드 기능 제공
6. CSP, XSS 방어, 보안 렌더링 정책 제공
7. Playwright 기반 실사용자 관점 E2E와 성능 테스트 제공
8. Docusaurus 기반 문서, API, examples, sample catalog 제공
9. CDN/npm 모두 배포 가능
10. TypeScript와 JavaScript 모두 사용 가능

---

## 2. 설계상 핵심 판단

### 2.1 Headless Core + DOM Renderer + Framework Wrapper

OneGrid는 기능 로직과 렌더링을 분리한다.

```text
@onegrid/core
  - 상태, 데이터 모델, 컬럼 모델, 이벤트, 명령, selection, filtering, sorting, grouping, merge 계산

@onegrid/dom
  - 실제 DOM 렌더링, virtual scroll, overlay, menu, editor, keyboard, accessibility

@onegrid/react
  - React lifecycle, props bridge, ref bridge, render slot bridge

@onegrid/vue
  - Vue lifecycle, props bridge, expose bridge, slot bridge
```

이 구조를 지키면 React/Vue wrapper가 core 기능을 재구현하지 않고 안정적으로 확장된다.

### 2.2 Row Model을 명확히 분리

OneGrid의 row model은 다음을 지원한다.

| Row Model | 목적 | 데이터 위치 | 주요 기능 |
|---|---|---|---|
| `ClientRowModel` | 중소 규모 client data | Browser memory | client sort/filter/group/aggregate |
| `InfiniteRowModel` | flat 대용량 lazy loading | Server | block loading, append scroll |
| `ServerRowModel` | enterprise server operation | Server | server sort/filter/group/aggregate/pivot |
| `ViewportRowModel` | 초대용량/실시간 viewport sync | Server | visible range request, live update |
| `TreeRowModel` | 계층 데이터 | Client 또는 Server | expand/collapse, lazy children |

대용량 목표는 `ServerRowModel`과 `ViewportRowModel` 중심으로 달성한다.

### 2.3 Merge는 렌더링 속성이 아니라 Layout Contract

header merge, group header, cell merge는 단순 `rowspan`, `colspan` 렌더링이 아니다.

OneGrid에서 merge는 다음 모든 영역에 영향을 준다.

- hit testing
- focus navigation
- keyboard selection
- range selection
- copy/paste
- cell editing
- virtual window clipping
- pinned left/center/right split
- column resize/reorder
- row height calculation
- accessibility label
- export
- print/PDF

따라서 merge는 core의 `MergeModel`과 layout의 `SpanMap`으로 관리한다.

---

## 3. 권장 저장소 구조

TUI Grid의 core/react/vue 패키지 분리 방식은 참고하되, OneGrid는 더 세분화된 모노레포 구조를 사용한다.

```text
onegrid/
  AGENTS.md
  ARCHITECT.md
  CHECKLIST.md
  API_CHANGELOG.md
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
  turbo.json

  packages/
    core/
      src/
        column/
        row/
        data/
        state/
        events/
        commands/
        selection/
        editing/
        filtering/
        sorting/
        grouping/
        aggregation/
        pivot/
        tree/
        merge/
        pagination/
        export/
        security/
        plugin/
        i18n/
        types/
      test/
      package.json

    dom/
      src/
        grid/
        renderer/
        viewport/
        layout/
        header/
        body/
        footer/
        pinned/
        overlay/
        menu/
        editor/
        keyboard/
        a11y/
        theme/
        csp/
      test/
      package.json

    react/
      src/
        OneGrid.tsx
        hooks/
        slots/
        types.ts
      test/
      package.json

    vue/
      src/
        OneGrid.vue
        composables/
        slots/
        types.ts
      test/
      package.json

    pagination/
      src/
        Pagination.ts
        ScrollPager.ts
        BottomPager.ts
      test/
      package.json

    themes/
      src/
        tokens/
        default.css
        clean.css
        compact.css
        dark.css
        high-contrast.css
      package.json

    adapters/
      src/
        rest/
        graphql/
        odata/
      package.json

    testing/
      src/
        fixtures/
        playwright/
        perf/
        a11y/
      package.json

  apps/
    examples/
      src/
        catalog.ts
        features/
        scenarios/
      package.json

    docs/
      docs/
        intro/
        getting-started/
        quick-start/
        api/
        methods/
        features/
        examples/
        security/
        performance/
        migration/
      package.json

    benchmark/
      src/
        virtual-scroll/
        server-row-model/
        viewport-row-model/
        merge/
        editing/
      package.json

    playground/
      src/
      package.json

  tests/
    e2e/
      features/
      scenarios/
      visual/
      csp/
    perf/
    a11y/
```

---

## 4. 패키지 책임

### 4.1 `@onegrid/core`

DOM 없는 순수 엔진이다.

책임:

- grid state store
- column normalization
- row identity
- row models
- filter/sort/group/aggregate pipeline
- selection/range model
- editing lifecycle state
- merge calculation
- pagination model
- plugin registry
- event bus / command bus
- export/import data transform
- security utility type

금지:

- DOM API 직접 사용
- React/Vue import
- CSS import
- browser 전용 global 의존

### 4.2 `@onegrid/dom`

브라우저 DOM 렌더러다.

책임:

- grid mount/destroy
- DOM virtualization
- segmented virtual scroll
- column virtualization
- pinned pane layout
- header/body/footer rendering
- overlay/menu/editor rendering
- focus and keyboard navigation
- ARIA grid semantics
- resize observer, intersection observer, scroll observer
- CSP-safe style injection

### 4.3 `@onegrid/react`

React wrapper다.

책임:

- `<OneGrid />` component
- `useOneGridApi()` hook
- React cell/header/editor renderer bridge
- controlled/uncontrolled option bridge
- cleanup on unmount

### 4.4 `@onegrid/vue`

Vue wrapper다.

책임:

- `<OneGrid />` component
- `useOneGridApi()` composable
- Vue slot renderer bridge
- `defineExpose` API bridge
- cleanup on unmount

### 4.5 `@onegrid/pagination`

페이지네이션 UI와 model bridge다.

지원:

- bottom pagination
- top pagination
- server pagination
- client pagination
- scroll pagination
- append scroll
- cursor pagination
- page size selector
- page group navigation

### 4.6 `@onegrid/themes`

테마 토큰과 CSS를 제공한다.

지원:

- CSS variables
- design tokens
- density: comfortable / standard / compact
- light/dark/high contrast
- SI 프로젝트용 theme override
- runtime theme switch
- build-time theme extraction

### 4.7 `@onegrid/testing`

테스트 fixture와 helper를 제공한다.

지원:

- Playwright helper
- dataset generator
- server mock
- visual snapshot helper
- performance marker
- a11y helper

---

## 5. Public API 초안

### 5.1 Vanilla JS

```ts
import { OneGrid } from '@onegrid/dom';
import '@onegrid/themes/default.css';

const grid = new OneGrid({
  el: document.getElementById('grid')!,
  rowModel: 'server',
  columns: [
    { field: 'id', headerName: 'ID', width: 100, pinned: 'left' },
    { field: 'name', headerName: 'Name', editable: true, filter: 'text' },
    { field: 'amount', headerName: 'Amount', type: 'number', summary: 'sum' }
  ],
  dataSource: {
    async getRows(request) {
      const res = await fetch('/api/orders/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      return res.json();
    }
  }
});
```

### 5.2 React

```tsx
import { OneGrid } from '@onegrid/react';
import '@onegrid/themes/default.css';

export function OrdersGrid() {
  return (
    <OneGrid
      rowModel="server"
      columns={columns}
      dataSource={dataSource}
      pagination={{ mode: 'bottom', pageSize: 100 }}
      onCellEdited={(event) => console.log(event)}
    />
  );
}
```

### 5.3 Vue

```vue
<script setup lang="ts">
import { OneGrid } from '@onegrid/vue';
import '@onegrid/themes/default.css';
</script>

<template>
  <OneGrid
    row-model="server"
    :columns="columns"
    :data-source="dataSource"
    :pagination="{ mode: 'bottom', pageSize: 100 }"
    @cell-edited="onCellEdited"
  />
</template>
```

---

## 6. Core Type Contract

### 6.1 Grid Options

```ts
export interface GridOptions<TData = unknown> {
  el?: HTMLElement;
  columns: ColumnDef<TData>[];
  data?: TData[];
  dataSource?: DataSource<TData>;
  rowModel?: RowModelKind;
  rowKey?: string | ((row: TData, index: number) => string | number);
  width?: number | string;
  height?: number | string;
  bodyHeight?: number | string;
  rowHeight?: number | 'auto' | ((row: RowContext<TData>) => number);
  headerHeight?: number | number[];
  frozenRows?: FrozenRowOptions;
  frozenColumns?: FrozenColumnOptions;
  selection?: SelectionOptions;
  editing?: EditingOptions;
  filtering?: FilteringOptions;
  sorting?: SortingOptions;
  grouping?: GroupingOptions;
  aggregation?: AggregationOptions;
  pivot?: PivotOptions;
  tree?: TreeOptions;
  merge?: MergeOptions<TData>;
  pagination?: PaginationOptions;
  clipboard?: ClipboardOptions;
  export?: ExportOptions;
  security?: SecurityOptions;
  theme?: ThemeOptions;
  locale?: string;
  plugins?: GridPlugin[];
  events?: GridEventHandlers<TData>;
}
```

### 6.2 Column Definition

```ts
export type ColumnDef<TData = unknown> = DataColumnDef<TData> | ColumnGroupDef<TData>;

export interface DataColumnDef<TData = unknown> {
  field: string;
  headerName?: string;
  headerTooltip?: string;
  type?: ColumnType;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  pinned?: 'left' | 'right';
  hidden?: boolean;
  resizable?: boolean;
  movable?: boolean;
  sortable?: boolean;
  sort?: 'asc' | 'desc';
  filter?: FilterKind | FilterOptions;
  editable?: boolean | EditablePredicate<TData>;
  editor?: EditorKind | EditorDef<TData>;
  renderer?: CellRendererDef<TData>;
  formatter?: ValueFormatter<TData>;
  parser?: ValueParser<TData>;
  validator?: ValueValidator<TData>;
  valueGetter?: ValueGetter<TData>;
  valueSetter?: ValueSetter<TData>;
  merge?: ColumnMergeOptions<TData>;
  summary?: SummaryKind | SummaryDef<TData>;
  menu?: HeaderMenuOptions;
  className?: string | ClassNameCallback<TData>;
  style?: CellStyle | CellStyleCallback<TData>;
}

export interface ColumnGroupDef<TData = unknown> {
  groupId?: string;
  headerName: string;
  children: ColumnDef<TData>[];
  marryChildren?: boolean;
  openByDefault?: boolean;
  pinned?: 'left' | 'right';
  headerClassName?: string;
  headerRenderer?: HeaderRendererDef<TData>;
}
```

### 6.3 Data Source

```ts
export interface DataSource<TData = unknown> {
  getRows(request: GetRowsRequest): Promise<GetRowsResult<TData>>;
  getChildren?(request: GetChildrenRequest): Promise<GetRowsResult<TData>>;
  updateRows?(request: UpdateRowsRequest<TData>): Promise<UpdateRowsResult<TData>>;
  getDistinctValues?(request: DistinctValuesRequest): Promise<DistinctValuesResult>;
  getAggregates?(request: AggregateRequest): Promise<AggregateResult>;
  destroy?(): void;
}

export interface GetRowsRequest {
  rowModel: RowModelKind;
  startRow: number;
  endRow: number;
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortModel: SortModel[];
  filterModel: FilterModel;
  groupModel: GroupModel;
  groupKeys: string[];
  pivotModel?: PivotModel;
  aggregateModel?: AggregateModel;
  viewport?: ViewportRange;
  signal?: AbortSignal;
  requestId: string;
  snapshotVersion?: string;
}

export interface GetRowsResult<TData = unknown> {
  rows: TData[];
  rowCount?: number;
  nextCursor?: string;
  hasMore?: boolean;
  aggregate?: AggregateResult;
  groupMeta?: GroupMeta[];
  mergeMeta?: MergeMeta[];
  snapshotVersion?: string;
}
```

### 6.4 Grid API

```ts
export interface GridApi<TData = unknown> {
  destroy(): void;
  refresh(options?: RefreshOptions): Promise<void>;
  setData(rows: TData[]): void;
  appendRows(rows: TData[]): void;
  updateRows(rows: RowUpdate<TData>[]): void;
  removeRows(rowKeys: RowKey[]): void;
  getRow(rowKey: RowKey): TData | undefined;
  getSelectedRows(): TData[];
  selectRows(rowKeys: RowKey[]): void;
  clearSelection(): void;
  startEdit(position: CellPosition): void;
  stopEdit(options?: StopEditOptions): void;
  validate(): ValidationResult;
  setColumns(columns: ColumnDef<TData>[]): void;
  showColumn(field: string): void;
  hideColumn(field: string): void;
  pinColumn(field: string, side: 'left' | 'right' | null): void;
  autoSizeColumn(field: string): void;
  setFilterModel(model: FilterModel): void;
  getFilterModel(): FilterModel;
  setSortModel(model: SortModel[]): void;
  getSortModel(): SortModel[];
  setPage(page: number): void;
  getPage(): number;
  scrollToRow(rowIndex: number, align?: ScrollAlign): void;
  scrollToColumn(field: string, align?: ScrollAlign): void;
  exportData(options: ExportOptions): Promise<Blob | string>;
  copyToClipboard(options?: ClipboardCopyOptions): Promise<void>;
  pasteFromClipboard(text: string): Promise<void>;
  applyTheme(theme: ThemeInput): void;
  on<K extends GridEventName>(eventName: K, handler: GridEventHandler<K>): Unsubscribe;
  off<K extends GridEventName>(eventName: K, handler: GridEventHandler<K>): void;
}
```

---

## 7. Rendering Architecture

### 7.1 화면 영역

```text
Root
 ├─ Toolbar Slot
 ├─ GridViewport
 │   ├─ HeaderViewport
 │   │   ├─ HeaderLeftPinned
 │   │   ├─ HeaderCenterVirtualized
 │   │   └─ HeaderRightPinned
 │   ├─ BodyViewport
 │   │   ├─ BodyLeftPinned
 │   │   ├─ BodyCenterVirtualized
 │   │   └─ BodyRightPinned
 │   ├─ SummaryViewport
 │   ├─ FooterViewport
 │   └─ OverlayLayer
 ├─ Pagination Slot
 └─ LiveRegion
```

### 7.2 Virtual Scroll

OneGrid는 두 가지 스크롤 전략을 가진다.

#### Normal Virtual Scroll

중소/대형 데이터에서 사용한다.

```text
scrollTop -> visible row range -> render rows with translateY
```

#### Segmented Virtual Scroll

초대형 row count에서 사용한다.

```text
logicalRowIndex <-> segment <-> localScrollOffset
```

필요성:

- 브라우저의 단일 scroll height 한계 회피
- 100M row에서 안정적인 jump/seek 제공
- server viewport request와 결합

### 7.3 Column Virtualization

- center 영역만 horizontal virtualization 적용
- pinned left/right는 독립 렌더링
- group header와 merge span은 visible column range에 맞게 clipping
- column resize/reorder 후 header matrix 재계산

### 7.4 Variable Row Height

지원 단계:

1. fixed row height
2. estimated variable row height
3. measured variable row height
4. server-provided row height

100M rows에서는 full measurement 금지. 추정치와 visible measurement만 사용한다.

---

## 8. Merge Architecture

### 8.1 Header Matrix

컬럼 정의는 내부적으로 header matrix로 정규화한다.

```ts
interface HeaderCellNode {
  id: string;
  label: string;
  depth: number;
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
  pinned?: 'left' | 'right';
  leafFields: string[];
}
```

이 matrix는 다음에 사용된다.

- group header rendering
- header merge
- header menu positioning
- column drag/drop
- column resize
- accessibility label
- export header generation

### 8.2 Cell Span Map

```ts
interface CellSpan {
  anchor: CellPosition;
  rowSpan: number;
  colSpan: number;
  visibleRowStart: number;
  visibleRowEnd: number;
  visibleColStart: number;
  visibleColEnd: number;
  clipped: boolean;
}
```

Cell merge 종류:

| 종류 | 설명 |
|---|---|
| value merge | 동일 값 연속 셀 자동 병합 |
| custom merge | callback 기반 병합 |
| server merge | 서버가 mergeMeta 제공 |
| row span | 세로 병합 |
| col span | 가로 병합 |
| block span | rowSpan + colSpan |

### 8.3 Merge와 선택/편집

- 병합 셀 클릭 시 anchor cell을 기준으로 selection 생성
- 병합 영역 내부 방향키 이동은 span boundary 기준
- edit는 anchor cell에서만 시작
- copy는 병합 정보를 보존할 수 있어야 함
- paste는 병합 영역에 대한 정책 필요: reject / expand / anchor-only

---

## 9. Data Pipeline

Client Mode pipeline:

```text
raw data
 -> row identity
 -> value getter
 -> filter
 -> sort
 -> group/tree
 -> aggregate
 -> pagination
 -> viewport range
 -> render model
```

Server Mode pipeline:

```text
grid state
 -> request builder
 -> dataSource.getRows
 -> cache store
 -> viewport range
 -> render model
```

Server Mode에서 sort/filter/group/aggregate/pivot은 기본적으로 서버에 위임한다. client fallback은 명시적으로만 허용한다.

---

## 10. Feature Architecture

### 10.1 Filtering

지원 필터:

- text filter
- number filter
- date filter
- boolean filter
- set filter
- multi condition filter
- custom filter
- quick filter
- server filter model serialization

### 10.2 Sorting

지원:

- single sort
- multi sort
- custom comparator
- server sort model
- sort order cycle config

### 10.3 Editing

Editor lifecycle:

```text
idle
 -> preparing
 -> mounted
 -> focused
 -> dirty
 -> validating
 -> committing
 -> committed
 -> idle
```

취소 흐름:

```text
mounted/focused/dirty -> cancelling -> reverted -> idle
```

지원 editor:

- text
- number
- date
- datetime
- checkbox
- select
- multi-select
- radio
- textarea
- autocomplete
- button/action
- custom editor

IME, async validation, commit policy를 포함한다.

### 10.4 Selection

지원:

- cell selection
- row selection
- checkbox selection
- range selection
- multi range selection
- merged cell selection
- keyboard selection
- select all visible
- select all dataset in server mode with token policy

Server mode의 select all은 실제 모든 row key를 client에 생성하지 않는다. selection token 또는 predicate 기반으로 표현한다.

### 10.5 Pagination

지원 모드:

| Mode | 설명 |
|---|---|
| `client` | client data를 page 단위로 표시 |
| `server` | page/pageSize로 서버 요청 |
| `cursor` | nextCursor 기반 서버 요청 |
| `append-scroll` | 스크롤 하단 도달 시 append |
| `infinite` | block cache 기반 |
| `viewport` | visible range 기반 |
| `bottom` | 하단 페이지 UI |
| `top` | 상단 페이지 UI |
| `both` | 상하단 페이지 UI |

### 10.6 Menus

지원:

- header menu
- column menu
- filter menu
- context menu
- row context menu
- cell context menu
- selection context menu
- custom menu item
- keyboard accessible menu
- portal/layer positioning

### 10.7 Summary / Aggregation

지원:

- sum
- avg
- min
- max
- count
- distinct count
- custom summary
- group summary
- footer summary
- top summary
- server aggregate

### 10.8 Grouping / Tree / Pivot

지원:

- row grouping
- group expand/collapse
- group footer
- group aggregate
- tree data
- lazy tree children
- pivot row/column/value fields
- server pivot model

### 10.9 Clipboard / Export / Import

지원:

- copy selected cells
- copy selected rows
- copy with header
- paste range
- paste validation
- CSV export/import
- XLSX export/import
- PDF export
- print layout

Export는 visual layout과 data layout을 구분한다.

---

## 11. Security Architecture

### 11.1 기본 보안 정책

```ts
export interface SecurityOptions {
  csp?: {
    nonce?: string;
    disableStyleInjection?: boolean;
  };
  html?: {
    allowHtmlRenderer?: boolean;
    sanitizer?: HtmlSanitizer;
    trustedTypesPolicyName?: string;
  };
  url?: {
    allowedProtocols?: string[];
  };
}
```

### 11.2 Renderer Trust Level

| Renderer kind | 기본 처리 | 위험도 |
|---|---|---|
| text | escape | low |
| element | DOM builder | low-medium |
| html sanitized | sanitizer 적용 | medium |
| html unsafe | 1.0에서 기본 비허용 | high |

---

## 12. Theme Architecture

### 12.1 Token 체계

```css
:root {
  --og-font-family: system-ui, sans-serif;
  --og-font-size: 13px;
  --og-row-height: 36px;
  --og-header-height: 40px;
  --og-color-bg: #fff;
  --og-color-fg: #111;
  --og-color-border: #d7dbe0;
  --og-color-selected-bg: #e6f0ff;
  --og-color-focus-ring: #2f6fed;
}
```

### 12.2 커스터마이징

지원:

- CSS variables override
- theme object to CSS variables
- runtime theme switch
- scoped theme
- density switch
- dark mode
- high contrast
- SI 프로젝트용 design token mapping

---

## 13. Accessibility Architecture

필수:

- `role="grid"`
- `role="row"`
- `role="columnheader"`
- `role="gridcell"`
- `aria-rowcount`
- `aria-colcount`
- virtualized row의 `aria-rowindex`
- keyboard navigation
- screen reader live region
- menu ARIA
- editor focus trap

키보드:

| 키 | 동작 |
|---|---|
| Arrow keys | 셀 이동 |
| Tab / Shift+Tab | 편집 가능 셀 또는 다음 focus target 이동 |
| Enter | 편집 시작 또는 commit |
| Escape | 편집 취소 / 메뉴 닫기 |
| Space | checkbox toggle / row selection |
| Ctrl+C | copy |
| Ctrl+V | paste |
| Home/End | 행 시작/끝 |
| Ctrl+Home/Ctrl+End | 전체 시작/끝 |
| PageUp/PageDown | viewport 단위 이동 |

---

## 14. Testing Architecture

### 14.1 테스트 계층

| 계층 | 도구 | 목적 |
|---|---|---|
| unit | Vitest | core pure logic |
| component | Vitest + DOM Testing Library | renderer fragment |
| e2e | Playwright | 사용자 조작 |
| visual | Playwright screenshot | 시각 회귀 |
| a11y | axe + Playwright | 접근성 |
| perf | custom benchmark + Playwright | scroll/render latency |
| memory | browser heap measurement | leak 탐지 |

### 14.2 E2E 테스트 원칙

- example page 기반으로 테스트한다.
- 사용자 role selector를 우선 사용한다.
- 스크린샷 비교를 포함한다.
- 브라우저 matrix: Chromium, Firefox, WebKit
- SI 주요 환경상 Chromium 계열은 필수 우선순위다.

### 14.3 성능 목표

초기 목표값은 다음과 같다. 실제 구현 후 기준값을 조정할 수 있지만, 조정 사유를 기록해야 한다.

| 항목 | 목표 |
|---|---:|
| initial mount 100K client rows metadata | < 1.5s |
| viewport scroll frame budget | 16.7ms target, 33ms max |
| body DOM row count | visible + overscan |
| body DOM cell count | visible rows × visible cols + overscan |
| server viewport request cancellation | supported |
| memory leak after 100 mount/destroy | no unbounded growth |
| 10M server rows first meaningful render | < 2s with mock server |
| 100M viewport navigation | no full dataset allocation |

---

## 15. Examples Architecture

모든 기능은 example을 가진다.

```text
apps/examples/src/features/
  basic/
  columns/
  header-groups/
  header-merge/
  cell-merge/
  frozen/
  virtual-scroll/
  server-row-model/
  viewport-row-model/
  pagination/
  filtering/
  sorting/
  editing/
  selection/
  clipboard/
  summary/
  grouping/
  tree/
  pivot/
  context-menu/
  header-menu/
  themes/
  csp/
  export/
  accessibility/
```

각 example은 다음을 제공한다.

- vanilla
- React
- Vue
- 설명 문서
- Playwright spec
- visual snapshot

---

## 16. Documentation Architecture

Docusaurus 구조:

```text
apps/docs/docs/
  intro/
    what-is-onegrid.mdx
    architecture.mdx
  getting-started/
    installation.mdx
    cdn.mdx
    npm.mdx
    typescript.mdx
  quick-start/
    vanilla.mdx
    react.mdx
    vue.mdx
  api/
    grid-options.mdx
    column-def.mdx
    grid-api.mdx
    events.mdx
    datasource.mdx
  methods/
    data.mdx
    selection.mdx
    editing.mdx
    filtering.mdx
    sorting.mdx
    pagination.mdx
  features/
    virtual-scroll.mdx
    server-mode.mdx
    header-groups.mdx
    header-merge.mdx
    cell-merge.mdx
    editing.mdx
    filters.mdx
    summary.mdx
    grouping.mdx
    tree.mdx
    pivot.mdx
    export.mdx
    security-csp.mdx
    themes.mdx
  examples/
    catalog.mdx
  performance/
    large-data.mdx
    benchmark.mdx
  migration/
    from-ag-grid-concepts.mdx
    from-tui-grid-concepts.mdx
```

---

## 17. Packaging Architecture

### 17.1 npm packages

```text
@onegrid/core
@onegrid/dom
@onegrid/react
@onegrid/vue
@onegrid/pagination
@onegrid/themes
@onegrid/adapters
@onegrid/testing
```

### 17.2 Build outputs

각 패키지는 필요한 범위에서 다음을 제공한다.

```text
dist/
  index.mjs
  index.cjs
  index.d.ts
  onegrid.css
  onegrid.umd.js
```

### 17.3 CDN

CDN 사용 예:

```html
<link rel="stylesheet" href="https://cdn.example.com/onegrid/themes/default.css" />
<script src="https://cdn.example.com/onegrid/onegrid.umd.js"></script>
<script>
  const grid = new OneGrid.OneGrid({ el, columns, data });
</script>
```

CDN build는 CSP와 SRI 문서화를 포함한다.

---

## 18. Release Architecture

### 18.1 Semver

- `0.x`: public API 검증 단계
- `1.0.0-rc.x`: feature complete + release hardening
- `1.0.0`: enterprise baseline release

### 18.2 1.0 Release Gate

1. 모든 core feature 완료
2. JS/React/Vue wrapper parity 확인
3. 모든 examples 완료
4. Docusaurus 문서 완료
5. Playwright E2E 통과
6. visual regression baseline 승인
7. CSP 테스트 통과
8. 10M/100M server/viewport benchmark 통과
9. memory leak 테스트 통과
10. API freeze 문서화
11. migration/compatibility 문서 제공

---

## 19. Risk Register

| ID | 위험 | 영향 | 대응 |
|---|---|---|---|
| R-001 | 100M rows를 client data로 오해 | 성능 실패 | Server/Viewport 모델로 명확히 제한 |
| R-002 | merge를 나중에 추가 | 레이아웃 재작성 | MergeModel을 초기부터 core에 포함 |
| R-003 | wrapper가 core 기능 재구현 | API 불일치 | wrapper는 bridge만 담당 |
| R-004 | examples 부족 | 기능 검증 실패 | 모든 기능 example 필수화 |
| R-005 | E2E가 내부 상태 위주 | 실제 UI 버그 누락 | Playwright user-visible assertion 필수 |
| R-006 | CSP 미고려 | 공공/금융 적용 실패 | nonce/sanitizer/Trusted Types 설계 |
| R-007 | 단일 파일 비대화 | 유지보수 실패 | LOC 제한과 module split |
| R-008 | server mode가 단순 paging 수준 | 엔터프라이즈 기능 부족 | SSRM request model과 cache 설계 |
| R-009 | variable row height + merge + pinned 충돌 | 렌더링 오류 | layout contract test matrix |
| R-010 | export가 visual merge를 반영하지 못함 | 업무 적용 실패 | export layout model 분리 |

---

## 20. 외부 참고 기준

- TUI Grid: core/react/vue 패키지 분리와 examples/docs 운영 방식 참고
- AG Grid: Client/Infinite/Server-Side/Viewport row model 개념 참고
- RealGrid: 컨텍스트 메뉴, 셀 병합, 그룹핑, 테마, 트리, 라이브 예제 운영 방식 참고
- IBSheet8: 다양한 컬럼 타입, 대용량, 페이징/append scroll, 문서 연동, 요약/그룹핑/피벗, 헤더 병합 기능 범위 참고
- Playwright: 실사용자 E2E와 visual regression 기준
- Docusaurus: 문서 사이트와 MDX 기반 API/예제 문서 기준

참고 제품의 소스 코드나 라이선스 제한 구현을 복제하지 않는다. OneGrid는 독립 구현이어야 한다.
