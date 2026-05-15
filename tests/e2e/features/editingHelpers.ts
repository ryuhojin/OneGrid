import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

export async function editText(page: Page, field: string, value: string): Promise<void> {
  await openEditor(page, field);
  await editorControl(page, headerFor(field)).fill(value);
  await page.keyboard.press("Enter");
}

export async function openEditor(page: Page, field: string): Promise<void> {
  await cell(page, field).dblclick();
  await expect(page.getByRole("dialog", { name: `Edit ${headerFor(field)}` })).toBeVisible();
}

export function cell(page: Page, field: string) {
  return cellFor(page, "ED-0001", field);
}

export function cellFor(page: Page, rowKey: string, field: string) {
  return page.locator(`[data-layout-section="body"] [data-field="${field}"][data-edit-row-key="${rowKey}"]`).first();
}

export function activeDisplayCheckbox(page: Page) {
  return cell(page, "active").locator('input[type="checkbox"]').first();
}

export async function clickVisibleCenterCell(page: Page, rowKey: string, field: string): Promise<void> {
  const point = await page.evaluate(({ rowKey, field }) => {
    const cellElement = document.querySelector<HTMLElement>(
      `[data-layout-section="body"] [data-field="${field}"][data-edit-row-key="${rowKey}"]`
    );
    const leftPane = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="left"][data-layout-pane-visible="true"]'
    );
    if (!cellElement) {
      return undefined;
    }

    const cellRect = cellElement.getBoundingClientRect();
    const leftPinnedRight = leftPane?.getBoundingClientRect().right ?? cellRect.left;
    return {
      x: Math.min(cellRect.right - 4, Math.max(cellRect.left + 4, leftPinnedRight + 12)),
      y: cellRect.top + cellRect.height / 2
    };
  }, { rowKey, field });
  if (!point) {
    throw new Error(`Cell ${rowKey}:${field} was not rendered.`);
  }
  await page.mouse.click(point.x, point.y);
}

export function editorControl(page: Page, header: string) {
  return page.locator(`.og-grid__editor-overlay [aria-label="Edit ${header}"]`).first();
}

export async function editorPaneGaps(page: Page): Promise<{
  readonly leftGap: number;
  readonly rightGap: number;
  readonly width: number;
}> {
  return page.evaluate(() => {
    const editor = document.querySelector<HTMLElement>(".og-grid__editor-overlay");
    const leftPane = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="left"][data-layout-pane-visible="true"]'
    );
    const rightPane = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="right"][data-layout-pane-visible="true"]'
    );
    if (!editor || !leftPane || !rightPane) {
      return { leftGap: Number.NEGATIVE_INFINITY, rightGap: Number.NEGATIVE_INFINITY, width: 0 };
    }

    const editorRect = editor.getBoundingClientRect();
    return {
      leftGap: editorRect.left - leftPane.getBoundingClientRect().right,
      rightGap: rightPane.getBoundingClientRect().left - editorRect.right,
      width: editorRect.width
    };
  });
}

export async function focusedCellPaneGaps(page: Page): Promise<{
  readonly leftGap: number;
  readonly rightGap: number;
}> {
  return page.evaluate(() => {
    const focusedCell = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-focus-active="true"]'
    );
    const leftPane = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="left"][data-layout-pane-visible="true"]'
    );
    const rightPane = document.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="right"][data-layout-pane-visible="true"]'
    );
    if (!focusedCell || !leftPane || !rightPane) {
      return {
        leftGap: Number.NEGATIVE_INFINITY,
        rightGap: Number.NEGATIVE_INFINITY
      };
    }

    const cellRect = focusedCell.getBoundingClientRect();
    return {
      leftGap: cellRect.left - leftPane.getBoundingClientRect().right,
      rightGap: rightPane.getBoundingClientRect().left - cellRect.right
    };
  });
}

export async function editorCellOffset(page: Page, field: string, rowKey = "ED-0001"): Promise<number> {
  const [cellBox, editorBox] = await Promise.all([
    cellFor(page, rowKey, field).boundingBox(),
    page.locator(".og-grid__editor-overlay").first().boundingBox()
  ]);
  if (!cellBox || !editorBox) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(
    Math.abs(cellBox.x - editorBox.x),
    Math.abs(cellBox.y - editorBox.y),
    Math.abs(cellBox.width - editorBox.width)
  );
}

export function summaryValue(page: Page, label: string) {
  return page
    .getByLabel("Editing summary")
    .locator(`xpath=.//dt[normalize-space(.)="${label}"]/following-sibling::dd[1]`);
}

export async function setHorizontalScroll(
  locator: Locator,
  scrollLeft: number
): Promise<void> {
  await locator.evaluate((element, nextScrollLeft) => {
    element.scrollLeft = nextScrollLeft;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  }, scrollLeft);
}

export async function readHorizontalScroll(locator: Locator): Promise<number> {
  return locator.evaluate((element) => element.scrollLeft);
}

function headerFor(field: string): string {
  const headers: Readonly<Record<string, string>> = {
    title: "Title",
    budget: "Budget",
    active: "Active",
    status: "Status",
    tags: "Tags",
    priority: "Priority",
    notes: "Notes",
    owner: "Owner",
    code: "Code",
    quickNote: "Quick Note",
    manualNote: "Manual Note"
  };
  return headers[field] ?? field;
}
