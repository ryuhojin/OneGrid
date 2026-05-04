<div align="center">

# ⚡ OneGrid

### Enterprise-grade data grid platform for high-volume business applications

OneGrid is a TypeScript-first frontend grid platform for financial, public-sector,
and SI environments where scale, security, accessibility, and long-term
maintainability are first-class requirements.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Monorepo](https://img.shields.io/badge/Monorepo-pnpm-0B1220?style=for-the-badge&logo=pnpm&logoColor=F69220)
![React](https://img.shields.io/badge/React-wrapper-61DAFB?style=for-the-badge&logo=react&logoColor=0B1220)
![Vue](https://img.shields.io/badge/Vue-wrapper-42B883?style=for-the-badge&logo=vuedotjs&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-tested-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![Security](https://img.shields.io/badge/Security-CSP%20%2F%20XSS-D71920?style=for-the-badge)
![Themes](https://img.shields.io/badge/Themes-runtime%20tokens-8B6F47?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-pre--1.0-FFB020?style=for-the-badge)

**Vanilla JS · TypeScript · React · Vue · npm/CDN-ready architecture**

</div>

> 🚧 **Status:** pre-1.0 development. The repository is building toward a
> commercial OneGrid 1.0 release.

---

## ✨ Preview

| Column Virtualization | Pivot | Pagination |
| --- | --- | --- |
| ![Column virtualization](docs/assets/readme/onegrid-column-virtualization.png) | ![Pivot](docs/assets/readme/onegrid-pivot.png) | ![Pagination](docs/assets/readme/onegrid-pagination.png) |

---

## 🧾 Current Engineering Snapshot

OneGrid now has the core commercial grid surface wired through vanilla DOM,
React, and Vue examples. The active milestone is still pre-1.0, but the
repository is no longer a scaffold: feature work includes row models, layout,
editing, selection, export/import, localization, CSP/XSS hardening, theme
runtime, SI customization, and wrapper API parity.

| Track | Current coverage |
| --- | --- |
| ✅ Row models | Client, Infinite, Server with `groupKeys`, Viewport, Tree |
| ✅ Layout | Pinned panes, frozen rows/columns, row virtualization, column virtualization, merge-aware layout |
| ✅ Data operations | Sorting, filtering, grouping, summary/aggregation, tree, pivot, pagination |
| ✅ User workflows | Editing with batch commit, selection, clipboard, menus, export/import |
| ✅ Enterprise baseline | Localization, CSP controls, XSS-safe renderers, theme tokens, SI tenant palettes |
| ✅ Frameworks | Vanilla, React, Vue examples plus shared option/event/method parity |

---

## 🧭 Why OneGrid

OneGrid is not a table widget. It is a layered grid engine with separated core
logic, DOM rendering, framework wrappers, examples, documentation, and verification
assets.

| Area | What OneGrid Provides |
| --- | --- |
| 🧠 Core engine | DOM-free row, column, state, event, merge, sort, filter, selection, editing, grouping, aggregation, tree, pivot, and server contracts |
| 🖥 DOM renderer | Pinned panes, virtualized body/columns, keyboard focus, overlays, menus, editors, scrollbars, and ARIA semantics |
| ⚛ React | Lifecycle, prop, event, and ref bridge without reimplementing core behavior |
| 🟢 Vue | Component and expose bridge aligned with the same core API model |
| 🌍 Localization | Locale registry, Korean/English baseline locales, runtime locale switching, formatter bridges |
| 🎨 Themes | CSS token foundation, default/clean/compact/dark/high-contrast presets, SI theme builder |
| 🛡 Security | Escaped text defaults, sanitizer-ready HTML paths, CSP-conscious styling, and no `eval`/`new Function` design |
| 🧪 Quality | Unit, E2E, a11y, visual, and performance smoke test coverage |

---

## 🚀 Feature Coverage

| Category | Features |
| --- | --- |
| 📊 Columns | Column model, grouped headers, header merge, column menu, resize, reorder, visibility, left/right pinning |
| 🧱 Layout | Base layout, pinned panes, frozen rows/columns, row virtualization, column virtualization, cell merge layout |
| 🌊 Row Models | Client, Infinite, Server, Viewport, Tree |
| 🧩 Core Features | Sorting, filtering, editing, selection, clipboard, menus, summary, grouping, tree, pivot, pagination, export/import |
| 🌐 Internationalization | Locale registry, `en-US`, `ko-KR`, runtime switch, number/date formatter bridge |
| 🎨 Theming | Runtime theme API, scoped CSS variables, density, clean/compact/dark/high-contrast presets, SI token mapping |
| 🛡 Security | CSP nonce, style injection controls, text-safe defaults, HTML sanitizer opt-in, Trusted Types path, URL protocol allowlist |
| 🔌 Wrappers | Vanilla `OneGrid`, React component/ref bridge, Vue component/expose bridge, API parity matrix |
| ♿ Accessibility | ARIA grid/treegrid semantics, keyboard focus, focus trap, screen-reader status regions |
| 🧪 Examples | Vanilla, React, and Vue variants for roadmap features |

Roadmap status and implementation evidence are tracked in [`CHECKLIST.md`](CHECKLIST.md).

---

## 📦 Packages

| Package | Purpose |
| --- | --- |
| `@onegrid/core` | DOM-free public types, models, state, events, and engine logic |
| `@onegrid/dom` | Vanilla DOM renderer and runtime |
| `@onegrid/react` | React lifecycle and ref bridge |
| `@onegrid/vue` | Vue component and expose bridge |
| `@onegrid/pagination` | Pagination state and page navigation helpers |
| `@onegrid/themes` | Theme tokens, preset CSS, runtime theme helpers, and SI theme builder |
| `@onegrid/adapters` | Server adapter foundations |
| `@onegrid/testing` | Test and benchmark helper foundation |

```text
apps/examples, apps/docs
  -> @onegrid/react, @onegrid/vue, @onegrid/dom
    -> @onegrid/dom
      -> @onegrid/core, @onegrid/pagination
```

Core does not depend on DOM APIs. Framework wrappers delegate to the DOM renderer
and core contracts rather than duplicating feature logic.

---

## ⚡ Quick Start

```bash
pnpm add @onegrid/core @onegrid/dom @onegrid/themes
```

```ts
import { OneGrid } from "@onegrid/dom";
import "@onegrid/themes/default.css";

interface OrderRow {
  id: string;
  customer: string;
  amount: number;
  status: "Approved" | "Review" | "Blocked";
}

const grid = new OneGrid<OrderRow>({
  el: document.querySelector("#grid")!,
  rowKey: "id",
  columns: [
    { field: "id", headerName: "ID", pinned: "left", width: 120 },
    { field: "customer", headerName: "Customer", width: 220 },
    { field: "amount", headerName: "Amount", type: "number", width: 140 },
    { field: "status", headerName: "Status", pinned: "right", width: 140 }
  ],
  data: [
    { id: "ORD-1001", customer: "Treasury Office", amount: 1200000, status: "Approved" },
    { id: "ORD-1002", customer: "Audit Bureau", amount: 430000, status: "Review" }
  ],
  layout: { width: "100%", height: 420 },
  accessibility: { label: "Orders grid" }
});

grid.setPage(1);
grid.applyTheme({ name: "clean", density: "standard" });
```

---

## 🛰 Server Row Model

Large datasets stay outside the browser. Server, infinite, and viewport row models
request only the current page, block, or viewport window.

```ts
const grid = new OneGrid<OrderRow>({
  el,
  rowKey: "id",
  rowModel: "server",
  columns,
  dataSource: {
    async getRows(request) {
      // request.groupKeys, sortModel, filterModel, aggregateModel, pivotModel,
      // viewport, page, and cursor are serialized by the shared core contract.
      const response = await fetch("/api/orders/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request)
      });

      return response.json();
    }
  },
  pagination: {
    mode: "server",
    position: "bottom",
    page: 1,
    pageSize: 100,
    pageSizeOptions: [50, 100, 250],
    pageGroupSize: 5
  }
});
```

Server grouping is server-owned. Root requests can return `groupMeta`; expanding a
group sends `groupKeys` back to the `DataSource`, and the server returns the
expanded group header plus leaf rows for that scope.

---

## 📤 Export / Import

The export foundation supports grid-shaped CSV, XLSX-like workbook data, print
layout, and PDF-oriented rendering paths with merge/header layout awareness.
Import flows replace the current dataset by default, with append behavior kept as
an explicit option.

```ts
await grid.exportData({ format: "csv", fileName: "orders.csv" });
await grid.importData(file, { mode: "replace" });
```

---

## 🛡 Security Defaults

OneGrid renders strings as text by default. HTML rendering is an explicit opt-in
path that must pass through the configured security boundary.

```ts
import { OneGrid, strictTextOnlySanitizer } from "@onegrid/dom";

new OneGrid({
  el,
  columns,
  data,
  security: {
    csp: {
      nonce: window.__CSP_NONCE__,
      disableStyleInjection: false
    },
    html: {
      allowHtmlRenderer: true,
      trustedTypesPolicyName: "onegrid",
      sanitizer: strictTextOnlySanitizer
    },
    url: {
      allowedProtocols: ["http:", "https:", "mailto:"]
    }
  }
});
```

---

## 🎨 Themes and SI Customization

Themes are CSS-variable based and can be switched at runtime without remounting.
SI projects can map customer design tokens into scoped OneGrid variables.

```ts
import { createSiTheme } from "@onegrid/themes";

grid.applyTheme(
  createSiTheme({
    name: "si-bnk-red",
    tokens: {
      colors: {
        primary: "rgb(215 25 31)",
        accent: "rgb(137 110 74)",
        surface: "#ffffff"
      }
    }
  })
);
```

---

## ⚛ React

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
      rowKey="id"
      columns={columns}
      data={rows}
      layout={{ width: "100%", height: 420 }}
      accessibility={{ label: "Orders grid" }}
    />
  );
}
```

React exposes the same method names as vanilla `GridApi` through refs. Events use
the same semantic names through React props.

---

## 🟢 Vue

```bash
pnpm add @onegrid/vue @onegrid/core @onegrid/dom @onegrid/themes
```

```vue
<template>
  <OneGrid
    row-key="id"
    :columns="columns"
    :data="rows"
    :layout="{ width: '100%', height: 420 }"
    :accessibility="{ label: 'Orders grid' }"
  />
</template>

<script setup lang="ts">
import { OneGrid } from "@onegrid/vue";
import "@onegrid/themes/default.css";
</script>
```

Vue exposes the same `GridApi` method surface through template refs and emits the
same event names used by the DOM runtime.

---

## 🛠 Local Development

```bash
pnpm install
pnpm --filter @onegrid/examples dev --host 127.0.0.1 --port 4174
```

Open:

```text
http://127.0.0.1:4174
```

Useful routes:

| Route | What to inspect |
| --- | --- |
| `/#ROW-003` | Server row model with group expand requests |
| `/#LAY-003` | Column virtualization and pinned-pane scroll sync |
| `/#F-EXPORT` | Export/import, print, PDF/XLSX layout paths |
| `/#F-I18N` | Runtime locale switching |
| `/#SEC-001` | CSP-safe example page |
| `/#THEME-002` | SI tenant theme palettes |

---

## ✅ Verification

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:e2e
pnpm test:a11y
pnpm test:perf:smoke
pnpm build
pnpm docs:build
```

Visual regression smoke tests:

```bash
pnpm test:e2e:visual
```

---

## 🗂 Documentation Map

| Document | Purpose |
| --- | --- |
| [`ARCHITECT.md`](ARCHITECT.md) | Architecture goals, package boundaries, row model strategy |
| [`CHECKLIST.md`](CHECKLIST.md) | Roadmap, completion evidence, verification notes |
| [`API_CHANGELOG.md`](API_CHANGELOG.md) | API contract changes |
| [`SECURITY.md`](SECURITY.md) | Security policy notes |
| [`apps/docs/docs`](apps/docs/docs) | Docusaurus documentation source |
| [`apps/docs/docs/frameworks`](apps/docs/docs/frameworks) | React, Vue, and API parity docs |
| [`apps/docs/docs/security`](apps/docs/docs/security) | CSP and XSS guidance |
| [`apps/docs/docs/features`](apps/docs/docs/features) | Feature guides and examples |

---

## 📜 License

License information is not finalized in this workspace. Add the project license
before publishing packages or distributing builds.
