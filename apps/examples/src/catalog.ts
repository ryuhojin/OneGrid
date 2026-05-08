export interface ExampleCatalogItem {
  readonly id: string;
  readonly title: string;
  readonly feature: string;
  readonly variants: readonly ("vanilla" | "react" | "vue")[];
}

export const examples: readonly ExampleCatalogItem[] = [
  {
    id: "EX-001-001",
    title: "Basic grid",
    feature: "basic",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-001-002",
    title: "Column types",
    feature: "column-types",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-001-003",
    title: "Row data update",
    feature: "row-data-update",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-001-004",
    title: "Grid API methods",
    feature: "grid-api-methods",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-002-001",
    title: "Group header setup",
    feature: "group-header",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-002-002",
    title: "Header merge setup",
    feature: "group-header",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-002-003",
    title: "Cell merge vertical",
    feature: "cell-merge",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-002-004",
    title: "Cell merge horizontal",
    feature: "cell-merge",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-002-005",
    title: "Cell merge block",
    feature: "cell-merge-block",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-002-006",
    title: "Frozen columns",
    feature: "frozen",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-002-007",
    title: "Frozen rows",
    feature: "frozen",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-002-008",
    title: "Variable row height",
    feature: "variable-row-height",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-003-001",
    title: "Client row model setup",
    feature: "client-row-model",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-003-002",
    title: "Infinite row model setup",
    feature: "infinite-row-model",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-003-003",
    title: "Server row model setup",
    feature: "server-row-model",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-003-004",
    title: "Viewport row model setup",
    feature: "viewport-row-model",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-003-005",
    title: "Tree row model setup",
    feature: "tree-row-model",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-001",
    title: "Sorting setup",
    feature: "sorting",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-002",
    title: "Filtering setup",
    feature: "filtering",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-003",
    title: "Editing setup",
    feature: "editing",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-004",
    title: "Selection setup",
    feature: "selection",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-005",
    title: "Clipboard setup",
    feature: "clipboard",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-006",
    title: "Summary setup",
    feature: "summary",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-007",
    title: "Row grouping setup",
    feature: "grouping",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-008",
    title: "Tree setup",
    feature: "tree",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-009",
    title: "Pivot setup",
    feature: "pivot",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-010",
    title: "Pagination setup",
    feature: "pagination",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-011",
    title: "Context menu setup",
    feature: "menus",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-012",
    title: "Header menu setup",
    feature: "menus",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-004-013",
    title: "Export import setup",
    feature: "export",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-005-001",
    title: "CSP nonce setup",
    feature: "csp",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-005-002",
    title: "XSS-safe renderer setup",
    feature: "xss-defense",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-005-003",
    title: "Theme customization setup",
    feature: "si-customization",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-005-004",
    title: "Accessibility keyboard setup",
    feature: "accessibility",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-005-005",
    title: "10M server rows setup",
    feature: "qsp-server-10m",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-005-006",
    title: "100M viewport rows setup",
    feature: "qsp-viewport-100m",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-005-007",
    title: "Financial SI setup",
    feature: "qsp-financial-si",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "EX-005-008",
    title: "Public-sector SI setup",
    feature: "qsp-public-si",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "COL-001",
    title: "Column model",
    feature: "column-model",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "COL-002",
    title: "Group header",
    feature: "group-header",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "COL-003",
    title: "Column UI features",
    feature: "column-ui",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "ROW-001",
    title: "Client row model",
    feature: "client-row-model",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "ROW-002",
    title: "Infinite row model",
    feature: "infinite-row-model",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "ROW-003",
    title: "Server row model",
    feature: "server-row-model",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "ROW-004",
    title: "Viewport row model",
    feature: "viewport-row-model",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "ROW-005",
    title: "Tree row model",
    feature: "tree-row-model",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "LAY-001",
    title: "Base layout",
    feature: "base-layout",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "LAY-002",
    title: "Row virtualization",
    feature: "row-virtualization",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "LAY-003",
    title: "Column virtualization",
    feature: "column-virtualization",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "LAY-004",
    title: "Cell merge layout",
    feature: "cell-merge",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "DOM-001",
    title: "Renderer foundation",
    feature: "renderer-foundation",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "DOM-002",
    title: "Keyboard focus",
    feature: "keyboard-focus",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "DOM-003",
    title: "Accessibility",
    feature: "accessibility",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-SORT",
    title: "Sorting",
    feature: "sorting",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-FILTER",
    title: "Filtering",
    feature: "filtering",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-EDIT",
    title: "Editing",
    feature: "editing",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-SELECT",
    title: "Selection",
    feature: "selection",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-CLIP",
    title: "Clipboard",
    feature: "clipboard",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-MENU",
    title: "Menus",
    feature: "menus",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-SUMMARY",
    title: "Summary",
    feature: "summary",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-GROUP",
    title: "Row grouping",
    feature: "grouping",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-TREE",
    title: "Tree",
    feature: "tree",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-PIVOT",
    title: "Pivot",
    feature: "pivot",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-PAGE",
    title: "Pagination",
    feature: "pagination",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-FROZEN",
    title: "Frozen rows and columns",
    feature: "frozen",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-EXPORT",
    title: "Export / Import",
    feature: "export",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "F-I18N",
    title: "Localization",
    feature: "localization",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "SEC-001",
    title: "CSP",
    feature: "csp",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "SEC-002",
    title: "XSS defense",
    feature: "xss-defense",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "THEME-001",
    title: "Theme foundation",
    feature: "theme-foundation",
    variants: ["vanilla", "react", "vue"]
  },
  {
    id: "THEME-002",
    title: "SI customization",
    feature: "si-customization",
    variants: ["vanilla", "react", "vue"]
  }
];
