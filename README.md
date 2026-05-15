<div align="center">

# ⚡ OneGrid

**금융·공공 SI 프로젝트를 목표로 설계 중인 엔터프라이즈 프론트엔드 데이터 그리드**

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-wrapper-61dafb?style=for-the-badge&logo=react&logoColor=111827)](packages/react)
[![Vue](https://img.shields.io/badge/Vue-wrapper-42b883?style=for-the-badge&logo=vuedotjs&logoColor=white)](packages/vue)
[![Docusaurus](https://img.shields.io/badge/Docs-Docusaurus-2e8555?style=for-the-badge&logo=docusaurus&logoColor=white)](apps/docs)
[![Security](https://img.shields.io/badge/Security-CSP%20%2B%20XSS-d2151f?style=for-the-badge)](SECURITY.md)

OneGrid는 단순 테이블 컴포넌트가 아니라, 대용량 데이터 조회·편집·보안·접근성·문서화·프레임워크 래퍼까지 포함하는 상용 그리드 1.0을 목표로 개발되고 있습니다.

</div>

---

## 🧭 현재 상태

> 현재 버전은 `0.0.0` 프리 릴리즈 단계입니다. API는 1.0 안정화 전까지 변경될 수 있으며, 변경 사항은 [`API_CHANGELOG.md`](API_CHANGELOG.md)에 기록합니다.

| 영역 | 상태 |
| --- | --- |
| 패키지 구조 | `core`, `dom`, `react`, `vue`, `themes`, `pagination`, `adapters`, `testing` 분리 |
| 데이터 모델 | Client, Infinite, Server, Viewport, Tree row model baseline |
| 대용량 전략 | 10M/100M rows는 전체 배열/DOM이 아니라 Server/Viewport/Segmented virtual scroll 기반 |
| 레이아웃 | pinned pane, frozen rows/columns, row/column virtualization, header/cell merge |
| 핵심 기능 | sort, filter, edit, selection, clipboard, menu, summary, grouping, tree, pivot, pagination |
| 보안 | CSP nonce, text-only 기본 렌더링, sanitizer hook, URL protocol allowlist |
| 래퍼 | Vanilla DOM, React, Vue API parity baseline |
| 문서/예제 | Docusaurus 문서와 Vanilla/React/Vue 예제 카탈로그 운영 |

---

## 🖼️ 미리보기

| Column Virtualization | Pivot | Pagination |
| --- | --- | --- |
| ![Column virtualization screenshot](docs/assets/readme/onegrid-column-virtualization.png) | ![Pivot screenshot](docs/assets/readme/onegrid-pivot.png) | ![Pagination screenshot](docs/assets/readme/onegrid-pagination.png) |

---

## ✨ 왜 OneGrid인가

- 🏦 **SI 친화 구조**: 금융·공공 프로젝트에서 요구하는 고정 컬럼, 병합, 서버 데이터, 편집 이력, 보안 정책을 처음부터 고려합니다.
- 🧱 **분리된 아키텍처**: `@onegrid/core`는 DOM에 의존하지 않고, `@onegrid/dom`, `@onegrid/react`, `@onegrid/vue`가 동일한 계약을 소비합니다.
- 🚀 **대용량 기준의 설계**: 10M ~ 100M rows는 client array가 아니라 row model과 segmented viewport mapping으로 다룹니다.
- 🔐 **안전한 기본값**: 문자열 렌더링은 기본적으로 text 처리되고, HTML 렌더링은 sanitizer가 있는 명시적 opt-in으로 제한합니다.
- ♿ **실사용 접근성**: 키보드 포커스, ARIA grid semantics, header/menu interaction을 E2E로 검증합니다.
- 🎨 **테마 확장성**: CSS variable 기반 theme foundation과 SI tenant palette를 제공합니다.

---

## 📦 패키지

| 패키지 | 역할 |
| --- | --- |
| [`@onegrid/core`](packages/core) | public type, column/row/state/event/plugin contract, 순수 로직 |
| [`@onegrid/dom`](packages/dom) | DOM renderer, virtualization, focus, editor/menu/export runtime |
| [`@onegrid/react`](packages/react) | React wrapper, ref 기반 `GridApi`, React renderer slot bridge |
| [`@onegrid/vue`](packages/vue) | Vue wrapper, expose 기반 `GridApi`, Vue slot bridge |
| [`@onegrid/themes`](packages/themes) | default theme, SI theme token, runtime theme helper |
| [`@onegrid/pagination`](packages/pagination) | pagination contract/package baseline |
| [`@onegrid/adapters`](packages/adapters) | import/export and external adapter boundary |
| [`@onegrid/testing`](packages/testing) | test helpers and shared verification utilities |

---

## 🚀 빠른 시작

```bash
pnpm add @onegrid/core @onegrid/dom @onegrid/themes
```

```ts
import { OneGrid } from "@onegrid/dom";
import type { ColumnDef } from "@onegrid/core";
import "@onegrid/themes/default.css";

interface OrderRow {
  readonly id: string;
  readonly customer: string;
  readonly amount: number;
  readonly status: "Draft" | "Approved" | "Rejected";
}

const columns: readonly ColumnDef<OrderRow>[] = [
  { field: "id", headerName: "ID", pinned: "left" },
  { field: "customer", headerName: "Customer" },
  { field: "amount", headerName: "Amount", type: "number" },
  { field: "status", headerName: "Status", filter: "set" }
];

const rows: readonly OrderRow[] = [
  { id: "ORD-1001", customer: "Han Public Office", amount: 1200000, status: "Approved" },
  { id: "ORD-1002", customer: "Korea Finance", amount: 450000, status: "Draft" },
  { id: "ORD-1003", customer: "Metro Audit Team", amount: 780000, status: "Rejected" }
];

const grid = new OneGrid<OrderRow>({
  el: document.querySelector("#grid") as HTMLElement,
  columns,
  data: rows,
  rowModel: "client",
  accessibility: { label: "Orders grid" }
});

grid.selectRows(["ORD-1001"]);
```

### React

```bash
pnpm add @onegrid/react @onegrid/core @onegrid/dom @onegrid/themes
```

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
      accessibility={{ label: "Orders grid" }}
      onSelectionChanged={(event) => console.log(event.rowKeys)}
    />
  );
}
```

### Vue

```bash
pnpm add @onegrid/vue @onegrid/core @onegrid/dom @onegrid/themes
```

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
    :accessibility="{ label: 'Orders grid' }"
  />
</template>
```

---

## 🧩 주요 기능

### Column / Header

- `field` 기반 컬럼과 `columnId` 기반 fieldless column을 모두 지원합니다.
- `defaultColumnDef`, `columnTypes`, `columnState`, `getColumnState`, `setColumnState`, `resetColumnState`를 제공합니다.
- group header, header merge, pinned column, column resize/move/hide UI를 예제와 E2E 기준으로 관리합니다.

### Row Model

- `client`: 브라우저 메모리에 적합한 데이터셋용입니다.
- `infinite`: block request와 lazy loading 기반입니다.
- `server`: 서버 정렬/필터/그룹 확장 요청을 분리합니다.
- `viewport`: 논리 row index와 visible range 기반 대용량 탐색용입니다.
- `tree`: hierarchical row 표시와 expand/collapse baseline을 제공합니다.

### Editing

- cell editing, batch edit session, pending edit history, commit/cancel, undo/redo edit stack을 제공합니다.
- `Tab`, `Enter`, `Escape`, `Backspace` 편집 정책을 문서화하고 키보드 이동과 스크롤 동기화를 보강했습니다.
- read-only edit / external state integration을 통해 wrapper controlled state와 연동할 수 있습니다.

### Export / Import

- CSV, XLSX, PDF, print layout export를 제공합니다.
- import는 기본적으로 기존 데이터를 교체하며, append 방식은 별도 옵션으로 분리합니다.
- merge layout, grouped header, paged data, wide columns를 상용 산출물 품질 기준으로 계속 검증합니다.

---

## 🏎️ 대용량 데이터 원칙

OneGrid의 10M ~ 100M rows 지원은 아래를 의미합니다.

- 전체 row 배열을 브라우저에 올리지 않습니다.
- 전체 row DOM을 만들지 않습니다.
- `ServerRowModel`, `InfiniteRowModel`, `ViewportRowModel`, segmented virtual scroll mapping으로 탐색합니다.
- request dedupe, cancellation, cache window, logical row index를 조합합니다.

금지되는 방식:

```ts
// 금지: 100M rows 전체 배열 생성
const rows = Array.from({ length: 100_000_000 }, createRow);
```

권장 방식:

```ts
const grid = new OneGrid({
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
    viewportSize: 60,
    overscan: 24
  },
  virtualization: {
    segmented: true,
    rowHeight: 30
  }
});
```

---

## 🔐 보안 기본값

- `eval`, `new Function`, inline event handler를 사용하지 않습니다.
- 기본 cell/header renderer는 문자열을 HTML이 아니라 text로 처리합니다.
- HTML renderer는 명시적 opt-in이며 sanitizer를 주입해야 합니다.
- CSP nonce 기반 style injection을 지원합니다.
- URL formatter는 `http:`, `https:`, `mailto:`, `tel:` 등 허용 protocol만 통과시킵니다.

관련 문서:

- [`SECURITY.md`](SECURITY.md)
- [`apps/docs/docs/security/csp.mdx`](apps/docs/docs/security/csp.mdx)
- [`apps/docs/docs/security/xss.mdx`](apps/docs/docs/security/xss.mdx)

---

## 🎨 테마와 SI 커스터마이징

`@onegrid/themes`는 CSS variable 기반으로 구성되어 있고, tenant 단위 테마를 런타임에 적용할 수 있습니다.

```ts
import { createSiTheme } from "@onegrid/themes";

const theme = createSiTheme({
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
```

예제 카탈로그에는 BNK CI 색상을 기준으로 아래 계열을 구성해 둔 SI 팔레트 예제가 포함되어 있습니다.

- `si-bnk-red`
- `si-bnk-gold`
- `si-bnk-gray`

---

## 🧪 로컬 개발

```bash
pnpm install
pnpm --filter @onegrid/examples dev --host 127.0.0.1 --port 4174
```

브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:4174
```

자주 보는 예제:

| 경로 | 확인 포인트 |
| --- | --- |
| `/#COL-003` | 컬럼 UI, 메뉴, resize, pin/hide/move |
| `/#ROW-003` | Server row model과 group expand request |
| `/#LAY-003` | Column virtualization과 pinned pane scroll sync |
| `/#LAY-004` | Cell merge layout과 range selection |
| `/#F-EDIT` | Batch edit, pending edits, undo/redo |
| `/#F-EXPORT` | CSV/XLSX/PDF/print/import |
| `/#F-I18N` | 런타임 locale 변경 |
| `/#SEC-001` | CSP nonce 예제 |
| `/#THEME-002` | SI theme customization |
| `/#EX-005-006` | 100M viewport rows setup |

---

## ✅ 검증 명령

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

`bench:metrics`는 100M viewport, 10M segmented scroll, 50K column virtualization,
variable row height, merge, frozen+virtual 조합의 실제 `ms`, `ops/s`, `ms/op`
지표를 출력합니다.

시각 회귀 smoke:

```bash
pnpm test:e2e:visual
```

---

## 🗂️ 문서 지도

| 문서 | 용도 |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | 개발 에이전트 운영 규칙과 품질 기준 |
| [`ARCHITECT.md`](ARCHITECT.md) | 아키텍처 원칙, 패키지 경계, 대용량 전략 |
| [`CHECKLIST.md`](CHECKLIST.md) | 로드맵, 완료 증빙, 리스크/결정 기록 |
| [`API_CHANGELOG.md`](API_CHANGELOG.md) | public API 변경 이력 |
| [`SECURITY.md`](SECURITY.md) | 보안 정책과 기본값 |
| [`apps/docs/docs/api`](apps/docs/docs/api) | GridOptions, ColumnDef, GridApi, Events, Plugins |
| [`apps/docs/docs/features`](apps/docs/docs/features) | 기능별 가이드 |
| [`apps/docs/docs/frameworks`](apps/docs/docs/frameworks) | React, Vue, API parity |
| [`apps/docs/docs/quick-start`](apps/docs/docs/quick-start) | Vanilla, React, Vue 빠른 시작 |

---

## 🛣️ 릴리즈 방향

OneGrid 1.0 전까지 특히 아래 항목을 계속 강화합니다.

- 대용량 viewport/server row model의 브라우저별 스크롤 품질
- cell/header merge와 pinned/virtualization 조합의 회귀 테스트
- export/import 산출물의 Excel/PDF/print fidelity
- framework wrapper API parity와 controlled state integration
- CSP/XSS/a11y/performance 품질 게이트 자동화

---

## 📜 라이선스

라이선스는 아직 확정되지 않았습니다. npm/CDN 배포 또는 외부 배포 전 프로젝트 라이선스를 확정해야 합니다.
