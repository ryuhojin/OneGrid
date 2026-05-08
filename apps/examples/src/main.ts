import "@onegrid/themes/default.css";
import "./styles.css";
import { examples } from "./catalog.js";
import { mountAccessibilityExample } from "./features/accessibility/vanilla.js";
import { mountBaseLayoutExample } from "./features/base-layout/vanilla.js";
import { mountBasicExample } from "./features/basic/vanilla.js";
import { mountCellMergeBlockExample } from "./features/cell-merge-block/vanilla.js";
import { mountCellMergeExample } from "./features/cell-merge/vanilla.js";
import { mountClipboardExample } from "./features/clipboard/vanilla.js";
import { mountClientRowModelExample } from "./features/client-row-model/vanilla.js";
import { mountColumnModelExample } from "./features/column-model/vanilla.js";
import { mountColumnTypesExample } from "./features/column-types/vanilla.js";
import { mountColumnVirtualizationExample } from "./features/column-virtualization/vanilla.js";
import { mountColumnUiExample } from "./features/column-ui/vanilla.js";
import { mountCspExample } from "./features/csp/vanilla.js";
import { mountEditingExample } from "./features/editing/vanilla.js";
import { mountExportExample } from "./features/export/vanilla.js";
import { mountFilteringExample } from "./features/filtering/vanilla.js";
import { mountFrozenExample } from "./features/frozen/vanilla.js";
import { mountGridApiMethodsExample } from "./features/grid-api-methods/vanilla.js";
import { mountGroupHeaderExample } from "./features/group-header/vanilla.js";
import { mountGroupingExample } from "./features/grouping/vanilla.js";
import { mountInfiniteRowModelExample } from "./features/infinite-row-model/vanilla.js";
import { mountKeyboardFocusExample } from "./features/keyboard-focus/vanilla.js";
import { mountLocalizationExample } from "./features/localization/vanilla.js";
import { mountMenusExample } from "./features/menus/vanilla.js";
import { mountPaginationExample } from "./features/pagination/vanilla.js";
import { mountPivotExample } from "./features/pivot/vanilla.js";
import { mountQspFinancialSiExample } from "./features/qsp-financial-si/vanilla.js";
import { mountQspPublicSiExample } from "./features/qsp-public-si/vanilla.js";
import { mountQspServer10mExample } from "./features/qsp-server-10m/vanilla.js";
import { mountQspViewport100mExample } from "./features/qsp-viewport-100m/vanilla.js";
import { mountRendererFoundationExample } from "./features/renderer-foundation/vanilla.js";
import { mountRowDataUpdateExample } from "./features/row-data-update/vanilla.js";
import { mountRowVirtualizationExample } from "./features/row-virtualization/vanilla.js";
import { mountServerRowModelExample } from "./features/server-row-model/vanilla.js";
import { mountSiCustomizationExample } from "./features/si-customization/vanilla.js";
import { mountSelectionExample } from "./features/selection/vanilla.js";
import { mountSortingExample } from "./features/sorting/vanilla.js";
import { mountSummaryExample } from "./features/summary/vanilla.js";
import { mountThemeFoundationExample } from "./features/theme-foundation/vanilla.js";
import { mountTreeExample } from "./features/tree/vanilla.js";
import { mountTreeRowModelExample } from "./features/tree-row-model/vanilla.js";
import { mountVariableRowHeightExample } from "./features/variable-row-height/vanilla.js";
import { mountViewportRowModelExample } from "./features/viewport-row-model/vanilla.js";
import { mountXssDefenseExample } from "./features/xss-defense/vanilla.js";

interface MountedExample {
  destroy(): void;
}

type ExampleMount = (el: HTMLElement) => MountedExample;

const mounts: Readonly<Record<string, ExampleMount>> = {
  "EX-001-001": mountBasicExample,
  "EX-001-002": mountColumnTypesExample,
  "EX-001-003": mountRowDataUpdateExample,
  "EX-001-004": mountGridApiMethodsExample,
  "EX-002-001": mountGroupHeaderExample,
  "EX-002-002": mountGroupHeaderExample,
  "EX-002-003": mountCellMergeExample,
  "EX-002-004": mountCellMergeExample,
  "EX-002-005": mountCellMergeBlockExample,
  "EX-002-006": mountFrozenExample,
  "EX-002-007": mountFrozenExample,
  "EX-002-008": mountVariableRowHeightExample,
  "EX-003-001": mountClientRowModelExample,
  "EX-003-002": mountInfiniteRowModelExample,
  "EX-003-003": mountServerRowModelExample,
  "EX-003-004": mountViewportRowModelExample,
  "EX-003-005": mountTreeRowModelExample,
  "EX-004-001": mountSortingExample,
  "EX-004-002": mountFilteringExample,
  "EX-004-003": mountEditingExample,
  "EX-004-004": mountSelectionExample,
  "EX-004-005": mountClipboardExample,
  "EX-004-006": mountSummaryExample,
  "EX-004-007": mountGroupingExample,
  "EX-004-008": mountTreeExample,
  "EX-004-009": mountPivotExample,
  "EX-004-010": mountPaginationExample,
  "EX-004-011": mountMenusExample,
  "EX-004-012": mountMenusExample,
  "EX-004-013": mountExportExample,
  "EX-005-001": mountCspExample,
  "EX-005-002": mountXssDefenseExample,
  "EX-005-003": mountSiCustomizationExample,
  "EX-005-004": mountAccessibilityExample,
  "EX-005-005": mountQspServer10mExample,
  "EX-005-006": mountQspViewport100mExample,
  "EX-005-007": mountQspFinancialSiExample,
  "EX-005-008": mountQspPublicSiExample,
  "COL-001": mountColumnModelExample,
  "COL-002": mountGroupHeaderExample,
  "COL-003": mountColumnUiExample,
  "ROW-001": mountClientRowModelExample,
  "ROW-002": mountInfiniteRowModelExample,
  "ROW-003": mountServerRowModelExample,
  "ROW-004": mountViewportRowModelExample,
  "ROW-005": mountTreeRowModelExample,
  "LAY-001": mountBaseLayoutExample,
  "LAY-002": mountRowVirtualizationExample,
  "LAY-003": mountColumnVirtualizationExample,
  "LAY-004": mountCellMergeExample,
  "DOM-001": mountRendererFoundationExample,
  "DOM-002": mountKeyboardFocusExample,
  "DOM-003": mountAccessibilityExample,
  "F-SORT": mountSortingExample,
  "F-FILTER": mountFilteringExample,
  "F-EDIT": mountEditingExample,
  "F-SELECT": mountSelectionExample,
  "F-CLIP": mountClipboardExample,
  "F-MENU": mountMenusExample,
  "F-SUMMARY": mountSummaryExample,
  "F-GROUP": mountGroupingExample,
  "F-TREE": mountTreeExample,
  "F-PIVOT": mountPivotExample,
  "F-PAGE": mountPaginationExample,
  "F-FROZEN": mountFrozenExample,
  "F-EXPORT": mountExportExample,
  "F-I18N": mountLocalizationExample,
  "SEC-001": mountCspExample,
  "SEC-002": mountXssDefenseExample,
  "THEME-001": mountThemeFoundationExample,
  "THEME-002": mountSiCustomizationExample
};

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("Examples app root was not found.");
}

const firstExample = getRequiredFirstExample();

app.replaceChildren();

const heading = document.createElement("h1");
heading.textContent = "OneGrid Examples";

const list = document.createElement("nav");
list.setAttribute("aria-label", "Example catalog");

for (const example of examples) {
  const item = document.createElement("a");
  item.href = `#${example.id}`;
  item.textContent = example.title;
  list.append(item);
}

const exampleTitle = document.createElement("h2");
exampleTitle.className = "example-title";

const exampleHost = document.createElement("section");
let mountedExample: MountedExample | undefined;

function renderSelectedExample(): void {
  const selectedId = getSelectedExampleId();
  const selectedExample = examples.find((example) => example.id === selectedId) ?? firstExample;
  const mount = mounts[selectedExample.id];

  mountedExample?.destroy();
  mountedExample = undefined;
  exampleHost.replaceChildren();
  exampleHost.id = selectedExample.id;
  exampleHost.setAttribute("aria-label", `${selectedExample.title} example`);
  exampleTitle.textContent = selectedExample.title;

  if (mount) {
    mountedExample = mount(exampleHost);
  }
}

function getSelectedExampleId(): string {
  const hashId = window.location.hash.slice(1);
  return examples.some((example) => example.id === hashId) ? hashId : firstExample.id;
}

function getRequiredFirstExample() {
  const first = examples[0];
  if (!first) {
    throw new Error("At least one OneGrid example must be registered.");
  }

  return first;
}

window.addEventListener("hashchange", renderSelectedExample);
app.append(heading, list, exampleTitle, exampleHost);
renderSelectedExample();
