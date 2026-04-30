# OneGrid

Enterprise-grade data grid foundation for high-volume business applications.

OneGrid is a TypeScript-first frontend data grid platform designed for financial,
public-sector, and SI environments where large data, security policy, accessibility,
and long-term maintainability matter as much as the initial UI.

> Status: pre-1.0 development. The repository is building toward a commercial
> OneGrid 1.0 release with vanilla JavaScript, React, Vue, npm, and CDN targets.

## Why OneGrid

OneGrid is not a table widget. It is a layered grid engine with separated core
logic, DOM rendering, framework wrappers, examples, documentation, and verification
assets.

- Headless `@onegrid/core` for row, column, state, event, merge, sort, filter,
  selection, editing, grouping, aggregation, tree, pivot, and server contracts.
- DOM renderer in `@onegrid/dom` with pinned panes, virtualized body and columns,
  keyboard focus, overlays, menus, editors, scrollbars, and ARIA semantics.
- First-class wrappers for React and Vue without reimplementing core behavior.
- Large-data row models for client, infinite, server, viewport, and tree use cases.
- Security-oriented rendering defaults: escaped text, sanitizer-ready HTML paths,
  CSP-conscious styling, and no `eval`/`new Function` design.
- Real browser validation through Playwright E2E, accessibility, visual, and
  performance smoke tests.

## Packages

| Package | Purpose |
| --- | --- |
| `@onegrid/core` | DOM-free public types, models, state, events, and engine logic |
| `@onegrid/dom` | Vanilla DOM renderer and runtime |
| `@onegrid/react` | React lifecycle and ref bridge |
| `@onegrid/vue` | Vue component and expose bridge |
| `@onegrid/pagination` | Pagination state and page navigation helpers |
| `@onegrid/themes` | Theme tokens and default CSS |
| `@onegrid/adapters` | Server adapter foundations |
| `@onegrid/testing` | Test and benchmark helper foundation |

## Feature Coverage

OneGrid currently includes working examples for:

- Column model, grouped headers, column menus, pinning, resize, reorder, and visibility.
- Client, infinite, server, viewport, and tree row models.
- Base layout, pinned panes, row virtualization, column virtualization, and cell merge layout.
- Keyboard focus, accessibility, renderer foundation, menus, clipboard, and selection.
- Sorting, filtering, editing, summary/aggregation, row grouping, tree, pivot, and pagination.
- Vanilla JavaScript, React, and Vue example variants for each roadmap feature.

The roadmap and completion evidence are tracked in `CHECKLIST.md`.

## Install

```bash
pnpm add @onegrid/core @onegrid/dom @onegrid/themes
```

React:

```bash
pnpm add @onegrid/react @onegrid/core @onegrid/dom @onegrid/themes
```

Vue:

```bash
pnpm add @onegrid/vue @onegrid/core @onegrid/dom @onegrid/themes
```

## Quick Start

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

grid.setPage?.(1);
```

## Server Row Model

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

## React

```tsx
import { OneGrid } from "@onegrid/react";
import "@onegrid/themes/default.css";

export function OrdersGrid() {
  return (
    <OneGrid<OrderRow>
      rowKey="id"
      columns={columns}
      data={rows}
      layout={{ width: "100%", height: 420 }}
      accessibility={{ label: "Orders grid" }}
    />
  );
}
```

## Vue

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

## Local Development

```bash
pnpm install
pnpm --filter @onegrid/examples dev --host 127.0.0.1 --port 4174
```

Open:

```text
http://127.0.0.1:4174
```

## Verification

The baseline quality gate is:

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

Visual regression smoke tests are available through:

```bash
pnpm test:e2e:visual
```

## Architecture

OneGrid keeps feature logic and rendering boundaries explicit:

```text
apps/examples, apps/docs
  -> @onegrid/react, @onegrid/vue, @onegrid/dom
    -> @onegrid/dom
      -> @onegrid/core, @onegrid/pagination
```

Core does not depend on DOM APIs. Framework wrappers delegate to the DOM renderer
and core contracts rather than duplicating feature logic.

## Documentation

- Product and architecture rules: `AGENTS.md`, `ARCHITECT.md`
- Roadmap and evidence: `CHECKLIST.md`
- API changes: `API_CHANGELOG.md`
- Security policy notes: `SECURITY.md`
- Docusaurus docs: `apps/docs/docs`

## License

License information is not finalized in this workspace. Add the project license
before publishing packages or distributing builds.
