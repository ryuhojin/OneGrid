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
  }
];
