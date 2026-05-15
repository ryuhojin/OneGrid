<div align="center">

# ⚡ OneGrid

**금융·공공 SI를 위한 엔터프라이즈 프론트엔드 데이터 그리드 플랫폼**

OneGrid는 단순한 HTML 테이블 래퍼가 아닙니다.

`core`, `dom`, `react`, `vue`, `themes`, `adapters`, `testing`을 분리한 모노레포 구조 위에서
대용량 데이터, 병합 레이아웃, 서버 row model, 편집 이력, 보안 렌더링, 접근성, 문서화까지 함께 다루는
상용 그리드 1.0 릴리즈를 목표로 개발되고 있습니다.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-wrapper-61dafb?style=for-the-badge&logo=react&logoColor=111827)](packages/react)
[![Vue](https://img.shields.io/badge/Vue-wrapper-42b883?style=for-the-badge&logo=vuedotjs&logoColor=white)](packages/vue)
[![Docs](https://img.shields.io/badge/Docs-Docusaurus-2e8555?style=for-the-badge&logo=docusaurus&logoColor=white)](apps/docs)
[![Security](https://img.shields.io/badge/Security-CSP%20%2F%20XSS-d2151f?style=for-the-badge)](SECURITY.md)
[![Status](https://img.shields.io/badge/Status-0.0.0%20pre--release-6b7280?style=for-the-badge)](API_CHANGELOG.md)

[빠른 시작](#빠른-시작) ·
[기능](#기능-하이라이트) ·
[아키텍처](#core와-renderer-분리) ·
[예제](#예제-카탈로그) ·
[보안](#보안-기본값) ·
[검증](#검증-명령)

</div>

---

## 현재 상태

> OneGrid는 현재 `0.0.0` 프리릴리즈입니다. API는 1.0 안정화 전까지 조정될 수 있으며,
> 모든 public contract 변경은 [`API_CHANGELOG.md`](API_CHANGELOG.md)에 기록합니다.

| 영역 | 현재 수준 |
| --- | --- |
| 패키지 | `@onegrid/core`, `@onegrid/dom`, `@onegrid/react`, `@onegrid/vue`, `@onegrid/themes`, `@onegrid/adapters` |
| 렌더러 | Vanilla DOM renderer + React/Vue wrapper bridge |
| 데이터 모델 | Client, Infinite, Server, Viewport, Tree row model |
| 대용량 | 10M/100M rows를 Server/Viewport/Segmented virtual scroll로 탐색 |
| 레이아웃 | pinned/frozen pane, row/column virtualization, group/header/cell merge, variable row height |
| 엔터프라이즈 기능 | sort, filter, edit, selection, clipboard, menus, summary, grouping, tree, pivot, pagination, export/import |
| 보안 | CSP nonce, Trusted Types 검증, sanitizer adapter, spreadsheet formula guard, safe renderer boundary |
| 문서/예제 | Docusaurus 문서, examples catalog, Vanilla/React/Vue 예제, Playwright E2E |

---

## 미리보기

| Column Virtualization | Pivot Builder | Pagination |
| --- | --- | --- |
| ![Column virtualization screenshot](docs/assets/readme/onegrid-column-virtualization.png) | ![Pivot screenshot](docs/assets/readme/onegrid-pivot.png) | ![Pagination screenshot](docs/assets/readme/onegrid-pagination.png) |

---

## 왜 OneGrid인가

### SI 현장 기준으로 설계

금융·공공 프로젝트의 그리드는 "데이터를 보여주는 컴포넌트"가 아니라 업무 화면의 핵심 플랫폼입니다.
OneGrid는 다음 요구를 처음부터 같은 설계 안에서 다룹니다.

- 대량 조회, 서버 정렬/필터/그룹핑, viewport 기반 탐색
- group header, header merge, cell merge, pinned/frozen pane 조합
- batch editing, pending edit history, undo/redo, external state integration
- Excel/PDF/CSV/print export와 import adapter 경계
- CSP, XSS, Trusted Types, sanitizer, formula injection 방어
- keyboard focus, ARIA grid semantics, screen reader label, browser matrix 검증

### Core와 Renderer 분리

`@onegrid/core`는 DOM을 모릅니다.

컬럼/행/상태/이벤트/플러그인/보안/가상화 계약은 core가 소유하고, DOM/React/Vue는 같은 계약을 소비합니다.

```text
@onegrid/core
  -> pure contracts, state, row/column models, security, virtualization

@onegrid/dom
  -> rendering, scroll coordination, overlays, focus, menus, editors

@onegrid/react / @onegrid/vue
  -> lifecycle bridge, event bridge, slot/renderer bridge
```

이 구조 덕분에 wrapper가 core 기능을 재구현하지 않고도 동일한 API 정신 모델을 유지합니다.

---

## 빠른 시작

### 설치

```bash
pnpm add @onegrid/core @onegrid/dom @onegrid/themes
```

현재 저장소는 프리릴리즈 모노레포입니다. 로컬에서 직접 실행하려면 아래 개발 명령을 사용하세요.

```bash
pnpm install
pnpm --filter @onegrid/examples dev --host 127.0.0.1 --port 4174
```

### Vanilla / TypeScript

```ts
import { OneGrid } from "@onegrid/dom";
import type { ColumnDef } from "@onegrid/core";
import "@onegrid/themes/default.css";

interface OrderRow {
  readonly id: string;
  readonly agency: string;
  readonly program: string;
  readonly amount: number;
  readonly status: "Draft" | "Review" | "Approved";
}

const columns: readonly ColumnDef<OrderRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 140 },
  { field: "agency", headerName: "Agency", sortable: true, filter: "text" },
  { field: "program", headerName: "Program", resizable: true },
  { field: "amount", headerName: "Amount", type: "number", summary: "sum" },
  { field: "status", headerName: "Status", pinned: "right", filter: "set" }
];

const rows: readonly OrderRow[] = [
  { id: "ORD-1001", agency: "Treasury Office", program: "Budget approval", amount: 1200000, status: "Approved" },
  { id: "ORD-1002", agency: "Audit Bureau", program: "Risk sampling", amount: 430000, status: "Review" },
  { id: "ORD-1003", agency: "Welfare Office", program: "Care center", amount: 620000, status: "Draft" }
];

const grid = new OneGrid<OrderRow>({
  el: document.querySelector("#grid") as HTMLElement,
  columns,
  data: rows,
  rowKey: "id",
  rowModel: "client",
  selection: { mode: "range", multiple: true },
  editing: { enabled: true, commitMode: "batch", undoRedo: true },
  accessibility: { label: "Order approval grid" }
});

grid.setSortModel([{ field: "amount", direction: "desc" }]);
```

### React

```tsx
import { useRef } from "react";
import { OneGrid, type OneGridHandle } from "@onegrid/react";
import "@onegrid/themes/default.css";

export function OrdersGrid() {
  const gridRef = useRef<OneGridHandle<OrderRow>>(null);

  return (
    <OneGrid<OrderRow>
      ref={gridRef}
      columns={columns}
      data={rows}
      rowKey="id"
      rowModel="client"
      selection={{ mode: "range", multiple: true }}
      editing={{ enabled: true, commitMode: "batch", undoRedo: true }}
      accessibility={{ label: "Order approval grid" }}
      onSelectionChanged={(event) => console.log(event.rowKeys)}
    />
  );
}
```

### Vue

```vue
<script setup lang="ts">
import { ref } from "vue";
import { OneGrid, type OneGridExpose } from "@onegrid/vue";
import "@onegrid/themes/default.css";

const grid = ref<OneGridExpose>();
</script>

<template>
  <OneGrid
    ref="grid"
    :columns="columns"
    :data="rows"
    row-key="id"
    row-model="client"
    :selection="{ mode: 'range', multiple: true }"
    :editing="{ enabled: true, commitMode: 'batch', undoRedo: true }"
    :accessibility="{ label: 'Order approval grid' }"
  />
</template>
```

---

## 기능 하이라이트

| 기능 | OneGrid 계약 |
| --- | --- |
| Column model | `field`, `columnId`, `defaultColumnDef`, `columnTypes`, column state API |
| Header | group header, header merge, label presentation, validation, resize/reorder/pin/hide |
| Row models | client, infinite, server, viewport, tree |
| Virtualization | row virtualization, column virtualization, segmented virtual scroll, variable row height |
| Layout | pinned columns, frozen rows/columns, footer/summary, scroll coordinator |
| Merge | vertical/horizontal/block cell merge, span index, selection/export/focus integration |
| Sorting/filtering | client/server sort and filter contracts, quick filter, filter model |
| Editing | cell editing, batch edit session, pending edits, undo/redo, keyboard policy |
| Selection | row/cell/range selection, checkbox selection, merged-cell range projection |
| Clipboard | copy/paste, headers, formula injection guard, selected range support |
| Menus | header menu, context menu, column tool panel, overlay scroll subscription |
| Summary/grouping/tree/pivot | aggregation, row grouping, tree expand, pivot model and builder UI |
| Export/import | CSV, XLSX, PDF, print, import adapter, server document adapter |
| i18n | locale state, formatter bridge, runtime locale update |
| Security | CSP nonce, Trusted Types, sanitizer adapter, URL protocol allowlist |
| Theming | CSS variables, density, dark/high-contrast, SI palette validation |

---

## Row Model 선택 가이드

| Row model | 사용 상황 | 핵심 원칙 |
| --- | --- | --- |
| `client` | 브라우저 메모리에 안전하게 들어오는 중소 규모 데이터 | client sort/filter/group/edit |
| `infinite` | flat list를 block 단위로 lazy loading | block cache, retry, loading row |
| `server` | 서버가 정렬/필터/그룹/집계를 소유 | route cache, group expand request, server status |
| `viewport` | 10M~100M rows, 실시간/초대형 조회 | visible range request, logical row index, segmented scroll |
| `tree` | 계층 데이터와 lazy children | expand/collapse, tree selection, server parity |

100M rows 지원은 전체 배열을 만드는 기능이 아닙니다.

OneGrid는 브라우저 메모리에 전체 데이터를 올리지 않고, 현재 viewport 주변만 요청하고 렌더링합니다.

```ts
const grid = new OneGrid<OrderRow>({
  el,
  columns,
  rowModel: "viewport",
  dataSource: {
    async getRows({ startRow, endRow }) {
      return {
        rows: await fetchRows(startRow, endRow),
        rowCount: 100_000_000
      };
    }
  },
  viewport: {
    initialRowCount: 100_000_000,
    viewportSize: 80,
    overscan: 24,
    prefetchRows: 120
  },
  virtualization: {
    segmented: true,
    rowHeight: 32
  }
});
```

---

## 패키지 구성

| 패키지 | 역할 |
| --- | --- |
| [`@onegrid/core`](packages/core) | DOM-free public types, state, row/column/merge/security/virtualization contracts |
| [`@onegrid/dom`](packages/dom) | DOM renderer, layout, scroll, focus, menus, editors, export runtime |
| [`@onegrid/react`](packages/react) | React lifecycle bridge, ref API, event bridge |
| [`@onegrid/vue`](packages/vue) | Vue lifecycle bridge, expose API, event bridge |
| [`@onegrid/themes`](packages/themes) | default/clean/compact/dark/high-contrast CSS, SI theme tokens |
| [`@onegrid/pagination`](packages/pagination) | pagination contract and helper package |
| [`@onegrid/adapters`](packages/adapters) | export/import adapter plugin boundary |
| [`@onegrid/adapter-xlsx-exceljs`](packages/adapter-xlsx-exceljs) | ExcelJS 기반 XLSX adapter 경계 |
| [`@onegrid/adapter-pdf-pdfkit`](packages/adapter-pdf-pdfkit) | PDFKit 기반 PDF adapter 경계 |
| [`@onegrid/testing`](packages/testing) | fixtures, performance helpers, Playwright utilities |

---

## 보안 기본값

OneGrid의 기본 렌더링 정책은 안전한 쪽으로 닫혀 있습니다.

- 문자열 renderer 결과는 HTML이 아니라 text로 처리합니다.
- HTML renderer는 명시적 opt-in이며 sanitizer가 필요합니다.
- `eval`, `new Function`, inline event handler를 사용하지 않습니다.
- CSP nonce 기반 runtime style injection을 지원합니다.
- Trusted Types 실제 브라우저 검증 경로를 제공합니다.
- Clipboard/CSV export는 spreadsheet formula injection을 차단합니다.
- URL formatter는 허용 protocol만 통과시킵니다.

```ts
const grid = new OneGrid({
  el,
  columns,
  data,
  security: {
    cspNonce: window.__CSP_NONCE__,
    html: {
      allowHtmlRenderer: true,
      sanitizer: appSecurityTeamApprovedSanitizer
    }
  }
});
```

관련 문서:

- [`SECURITY.md`](SECURITY.md)
- [`apps/docs/docs/security/csp.mdx`](apps/docs/docs/security/csp.mdx)
- [`apps/docs/docs/security/xss.mdx`](apps/docs/docs/security/xss.mdx)
- [`apps/docs/docs/security/wrapper-renderers.mdx`](apps/docs/docs/security/wrapper-renderers.mdx)

---

## 테마와 SI 커스터마이징

테마는 CSS variable 기반입니다. 기본 테마 외에도 compact, dark, high-contrast, SI tenant palette를 구성할 수 있습니다.

```ts
import { createSiTheme, validateSiTheme } from "@onegrid/themes";

const bnkTheme = createSiTheme({
  name: "bnk-red",
  density: "compact",
  tokens: {
    colors: {
      accent: "rgb(215 25 31)",
      accentHover: "rgb(139 3 4)",
      border: "rgb(183 169 151)",
      header: "rgb(248 250 252)",
      selected: "rgb(255 238 238)",
      muted: "rgb(101 92 79)"
    }
  }
});

const result = validateSiTheme(bnkTheme);
if (result.valid) {
  grid.applyTheme(bnkTheme);
}
```

테마 검증은 contrast, token name, CSS value, minimum size gate를 확인합니다.

---

## 예제 카탈로그

로컬 예제 서버:

```bash
pnpm --filter @onegrid/examples dev --host 127.0.0.1 --port 4174
```

주요 예제:

| URL | 확인 포인트 |
| --- | --- |
| `http://127.0.0.1:4174/#EX-001-001` | Basic grid setup |
| `http://127.0.0.1:4174/#EX-002-004` | Header merge setup |
| `http://127.0.0.1:4174/#EX-002-008` | Variable row height |
| `http://127.0.0.1:4174/#ROW-003` | Server row model |
| `http://127.0.0.1:4174/#LAY-003` | Column virtualization |
| `http://127.0.0.1:4174/#LAY-004` | Cell merge layout |
| `http://127.0.0.1:4174/#F-EDIT` | Editing, batch commit, undo/redo |
| `http://127.0.0.1:4174/#F-PIVOT` | Pivot builder |
| `http://127.0.0.1:4174/#F-EXPORT` | Export/import |
| `http://127.0.0.1:4174/#EX-005-006` | 100M viewport rows setup |
| `http://127.0.0.1:4174/#THEME-002` | SI customization |

---

## 검증 명령

상용 그리드 품질을 목표로 아래 명령을 지속적으로 유지합니다.

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:e2e
pnpm test:a11y
pnpm test:perf:smoke
pnpm bench:metrics
pnpm build
pnpm docs:build
```

브라우저/보안 검증:

```bash
pnpm test:e2e:webkit
pnpm test:e2e:edge
pnpm test:e2e:security:browser-matrix
pnpm test:e2e:package-csp
pnpm test:e2e:visual
```

`bench:metrics`는 100M viewport, 10M segmented scroll, 50K column virtualization,
variable row height, merge, frozen+virtual 조합의 `ms`, `ops/s`, `ms/op`, DOM bound 지표를 출력합니다.

---

## 문서 지도

| 문서 | 내용 |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | 개발 운영 규칙과 품질 게이트 |
| [`ARCHITECT.md`](ARCHITECT.md) | 아키텍처 원칙과 패키지 경계 |
| [`CHECKLIST.md`](CHECKLIST.md) | 릴리즈 체크리스트, Evidence, Risk/Decision Log |
| [`API_CHANGELOG.md`](API_CHANGELOG.md) | public API 변경 이력 |
| [`SECURITY.md`](SECURITY.md) | 보안 정책 |
| [`apps/docs/docs/getting-started`](apps/docs/docs/getting-started) | 설치와 시작 |
| [`apps/docs/docs/api`](apps/docs/docs/api) | GridOptions, ColumnDef, GridApi, Events, Plugins |
| [`apps/docs/docs/features`](apps/docs/docs/features) | 기능별 가이드 |
| [`apps/docs/docs/frameworks`](apps/docs/docs/frameworks) | React, Vue, API parity |
| [`apps/docs/docs/security`](apps/docs/docs/security) | CSP, XSS, sanitizer, wrapper renderer security |
| [`apps/docs/docs/features/row-virtualization.mdx`](apps/docs/docs/features/row-virtualization.mdx) | 대용량/가상화 성능 정책 |

---

## 개발 원칙

OneGrid는 다음 제약을 릴리즈 전까지 계속 유지합니다.

- `core -> dom/react/vue` 의존 금지
- wrapper에서 core 기능 재구현 금지
- 10M~100M rows 전체 client array 생성 금지
- merge를 단순 `rowspan`/`colspan` DOM 문제로 축소 금지
- CSP/XSS/a11y/performance 검증 없는 기능 완료 금지
- 사용자가 보는 화면 기준의 Playwright E2E 유지
- public API 변경은 `API_CHANGELOG.md`에 기록

---

## 릴리즈 로드맵

1. Core contracts와 row/column model 안정화
2. DOM renderer layout, virtualization, merge, scroll coordinator hardening
3. Enterprise features: edit, selection, clipboard, menu, summary, grouping, tree, pivot, export/import
4. CSP/XSS/Trusted Types/security adapter 검증
5. Theme token validation과 SI customization
6. React/Vue wrapper API parity
7. Examples catalog, docs, E2E/a11y/perf/browser matrix final gates

상세 진행 상황은 [`CHECKLIST.md`](CHECKLIST.md)를 기준으로 관리합니다.

---

## 라이선스

현재 패키지는 `UNLICENSED` 프리릴리즈 상태입니다.

npm/CDN 또는 외부 배포 전 프로젝트 라이선스와 상용 배포 정책을 확정해야 합니다.
