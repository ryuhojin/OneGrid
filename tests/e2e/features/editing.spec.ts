import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

test("editing example stages every bundled editor kind and commits through toolbar", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await page.getByRole("button", { name: "Start batch session" }).click();
  await expect(summaryValue(page, "Batch session")).toHaveText("editing-example-batch:active:0");
  await expect(summaryValue(page, "Batch events")).toHaveText("1");

  await editText(page, "title", "Revised budget");
  await expect(cell(page, "title")).toHaveText("Revised budget");
  await expect(summaryValue(page, "Pending edits")).toHaveText("1");
  await expect(summaryValue(page, "Batch session")).toHaveText("editing-example-batch:active:1");
  await expect(summaryValue(page, "Commits")).toHaveText("0");

  await editText(page, "budget", "1250000");
  await expect(cell(page, "budget")).toHaveText("1250000");

  await cell(page, "active").click();
  await expect(activeDisplayCheckbox(page)).not.toBeChecked();
  await expect(page.getByRole("dialog", { name: "Edit Active" })).toBeHidden();
  await expect(summaryValue(page, "Pending detail")).toContainText("row 1 active: true -> false");

  await openEditor(page, "status");
  await editorControl(page, "Status").selectOption("Approved");
  await page.keyboard.press("Enter");
  await expect(cell(page, "status")).toHaveText("Approved");

  await openEditor(page, "tags");
  await editorControl(page, "Tags").selectOption(["budget", "security"]);
  await page.keyboard.press("Enter");
  await expect(cell(page, "tags")).toHaveText("budget, security");

  await openEditor(page, "priority");
  const mediumRadio = page.getByLabel("Medium");
  await expect(mediumRadio).toHaveClass(/og-grid__editor-native-radio/);
  await mediumRadio.check();
  await page.keyboard.press("Enter");
  await expect(cell(page, "priority")).toHaveText("Medium");

  await openEditor(page, "notes");
  await editorControl(page, "Notes").fill("Reviewed\nReady");
  await page.keyboard.press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");
  await expect(cell(page, "notes")).toHaveText("Reviewed Ready");

  await editText(page, "owner", "Park");
  await expect(cell(page, "owner")).toHaveText("Park");

  await editText(page, "code", "ok2");
  await expect(cell(page, "code")).toHaveText("OK2");
  await expect(summaryValue(page, "Pending edits")).toHaveText("9");
  await expect(page.getByLabel("Editing summary")).toContainText("enter:code:OK2");

  await page.getByRole("button", { name: "Commit changes" }).click();
  await expect(summaryValue(page, "Pending edits")).toHaveText("0");
  await expect(summaryValue(page, "Pending detail")).toHaveText("none");
  await expect(summaryValue(page, "Batch session")).toHaveText("editing-example-batch:committed:9");
  await expect(summaryValue(page, "Batch events")).toHaveText("2");
  await expect(summaryValue(page, "Commits")).toHaveText("9");
  await expect(page.getByLabel("Editing summary")).toContainText("api:code:OK2");
});

test("editing example validates, cancels, and respects IME composition", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await openEditor(page, "title");
  await editorControl(page, "Title").fill("No");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText("Title must be at least 3 characters");
  await expect(page.getByRole("dialog", { name: "Edit Title" })).toBeVisible();

  await editorControl(page, "Title").fill("Valid title");
  await page.keyboard.press("Escape");
  await expect(cell(page, "title")).toHaveText("Budget approval");
  await expect(summaryValue(page, "Cancels")).toHaveText("1");

  await openEditor(page, "code");
  await editorControl(page, "Code").fill("ERR-1");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText("Code cannot start with ERR");
  await editorControl(page, "Code").fill("ok3");
  await page.keyboard.press("Enter");
  await expect(cell(page, "code")).toHaveText("OK3");

  await openEditor(page, "title");
  const titleEditor = editorControl(page, "Title");
  await titleEditor.fill("IME title");
  await titleEditor.dispatchEvent("compositionstart");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Edit Title" })).toBeVisible();
  await titleEditor.dispatchEvent("compositionend");
  await page.keyboard.press("Enter");
  await expect(cell(page, "title")).toHaveText("IME title");
  await expect(summaryValue(page, "Pending edits")).toHaveText("2");
});

test("editing toolbar cancel keeps the previous value without blur commit", async ({ page }) => {
  await page.goto("/#F-EDIT");

  const viewport = page.locator(".og-grid__body-viewport").first();
  await setHorizontalScroll(viewport, 260);
  await expect.poll(() => readHorizontalScroll(viewport)).toBeGreaterThan(100);

  await page.getByRole("button", { name: "Edit title" }).click();
  const titleEditor = editorControl(page, "Title");
  await expect(titleEditor).toBeFocused();
  await expect.poll(() => editorCellOffset(page, "title")).toBeLessThanOrEqual(2);
  await titleEditor.fill("Cancelled title");

  await page.getByRole("button", { name: "Cancel edit" }).click();

  await expect(page.getByRole("dialog", { name: "Edit Title" })).toBeHidden();
  await expect(cell(page, "title")).toHaveText("Budget approval");
  await expect(summaryValue(page, "Pending edits")).toHaveText("0");
  await expect(summaryValue(page, "Commits")).toHaveText("0");
  await expect(summaryValue(page, "Cancels")).toHaveText("1");
  await expect(summaryValue(page, "Last staged")).toHaveText("none");
});

test("editing cancel changes restores every staged value", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await editText(page, "title", "Pending title");
  await cell(page, "active").click();

  await expect(cell(page, "title")).toHaveText("Pending title");
  await expect(activeDisplayCheckbox(page)).not.toBeChecked();
  await expect(summaryValue(page, "Pending edits")).toHaveText("2");

  await page.getByRole("button", { name: "Cancel changes" }).click();

  await expect(cell(page, "title")).toHaveText("Budget approval");
  await expect(activeDisplayCheckbox(page)).toBeChecked();
  await expect(summaryValue(page, "Pending edits")).toHaveText("0");
  await expect(summaryValue(page, "Cancels")).toHaveText("2");
});

test("editing blur cancels instead of committing by default in the example", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await openEditor(page, "title");
  const titleEditor = editorControl(page, "Title");
  await titleEditor.fill("Blur should cancel");

  await cell(page, "status").click();

  await expect(page.getByRole("dialog", { name: "Edit Title" })).toBeHidden();
  await expect(cell(page, "title")).toHaveText("Budget approval");
  await expect(summaryValue(page, "Commits")).toHaveText("0");
  await expect(summaryValue(page, "Cancels")).toHaveText("1");
  await expect(summaryValue(page, "Last cancel")).toHaveText("blur");
});

test("editing checkbox toggles inline and remains browser-stable", async ({ page }) => {
  await page.goto("/#F-EDIT");

  const activeCell = cell(page, "active");
  await expect(activeCell).toHaveClass(/og-grid__cell--editor-checkbox/);
  await expect(activeCell).toHaveCSS("cursor", "pointer");
  const displayBox = await activeDisplayCheckbox(page).boundingBox();
  const cellBox = await activeCell.boundingBox();
  expect(cellBox).not.toBeNull();
  expect(displayBox).not.toBeNull();
  expect(displayBox?.width ?? 0).toBeGreaterThanOrEqual(14);
  expect(displayBox?.height ?? 0).toBeGreaterThanOrEqual(14);

  await activeCell.click();
  await expect(page.getByRole("dialog", { name: "Edit Active" })).toBeHidden();
  await expect(activeDisplayCheckbox(page)).not.toBeChecked();
  await expect(summaryValue(page, "Pending edits")).toHaveText("1");
  await expect(summaryValue(page, "Last staged")).toHaveText("pointer:active:false");
});

test("editing start mode supports global defaults and column overrides", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await expect(cell(page, "title")).toHaveAttribute("data-edit-start-mode", "doubleClick");
  await expect(cell(page, "active")).toHaveAttribute("data-edit-start-mode", "singleClick");
  await expect(cell(page, "quickNote")).toHaveAttribute("data-edit-start-mode", "singleClick");
  await expect(cell(page, "manualNote")).toHaveAttribute("data-edit-start-mode", "manual");

  await cell(page, "quickNote").click();
  await expect(page.getByRole("dialog", { name: "Edit Quick Note" })).toBeVisible();
  await editorControl(page, "Quick Note").fill("Opened from click");
  await page.keyboard.press("Enter");
  await expect(cell(page, "quickNote")).toHaveText("Opened from click");

  await cell(page, "manualNote").click();
  await expect(page.getByRole("dialog", { name: "Edit Manual Note" })).toBeHidden();
  await cell(page, "manualNote").dblclick();
  await expect(page.getByRole("dialog", { name: "Edit Manual Note" })).toBeHidden();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Edit Manual Note" })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("editing keyboard policy starts, commits, moves, and clears explicitly", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await cell(page, "title").click();
  await page.keyboard.press("Backspace");
  await expect(page.getByRole("dialog", { name: "Edit Title" })).toBeVisible();
  await expect(editorControl(page, "Title")).toHaveValue("");
  await editorControl(page, "Title").fill("Backspace title");
  await page.keyboard.press("Enter");
  await expect(cell(page, "title")).toHaveText("Backspace title");

  await openEditor(page, "title");
  await editorControl(page, "Title").fill("Tab committed title");
  await page.keyboard.press("Tab");

  await expect(page.getByRole("dialog", { name: "Edit Title" })).toBeHidden();
  await expect(cell(page, "title")).toHaveText("Tab committed title");
  await expect(cell(page, "quickNote")).toHaveAttribute("data-focus-active", "true");
  await expect(page.getByLabel("Editing summary")).toContainText("tab:title:Tab committed title");
});

test("editing keyboard cell movement scrolls to reveal the focused cell", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/#F-EDIT");

  const viewport = page.locator(".og-grid__body-viewport").first();
  await setHorizontalScroll(viewport, 0);
  await cell(page, "title").click();

  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press("ArrowRight");
  }

  await expect.poll(() => readHorizontalScroll(viewport)).toBeGreaterThan(0);
  await expect.poll(() => focusedCellPaneGaps(page)).toMatchObject({
    leftGap: expect.any(Number),
    rightGap: expect.any(Number)
  });
  const gaps = await focusedCellPaneGaps(page);
  expect(gaps.leftGap).toBeGreaterThanOrEqual(-1);
  expect(gaps.rightGap).toBeGreaterThanOrEqual(-1);
});

test("editing overlay tracks body scrolling while the edited cell remains visible", async ({ page }) => {
  await page.goto("/#F-EDIT");

  const viewport = page.locator(".og-grid__body-viewport").first();
  await cell(page, "quickNote").click();
  await expect(page.getByRole("dialog", { name: "Edit Quick Note" })).toBeVisible();
  await expect.poll(() => editorCellOffset(page, "quickNote")).toBeLessThanOrEqual(2);

  await setHorizontalScroll(viewport, 80);

  await expect(page.getByRole("dialog", { name: "Edit Quick Note" })).toBeVisible();
  await expect.poll(() => editorCellOffset(page, "quickNote")).toBeLessThanOrEqual(2);
});

test("editing overlay tracks page scrolling", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await openEditor(page, "title");
  await expect(page.getByRole("dialog", { name: "Edit Title" })).toBeVisible();
  await expect.poll(() => editorCellOffset(page, "title")).toBeLessThanOrEqual(2);

  await page.evaluate(async () => {
    for (const scrollTop of [80, 180, 320, 140, 260]) {
      window.scrollTo(0, scrollTop);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
  });

  await expect.poll(() => editorCellOffset(page, "title")).toBeLessThanOrEqual(2);
});

test("editing overlay stays inside center pane when scrolled behind pinned columns", async ({ page }) => {
  await page.goto("/#F-EDIT");

  const viewport = page.locator(".og-grid__body-viewport").first();
  await setHorizontalScroll(viewport, 260);
  await expect.poll(() => readHorizontalScroll(viewport)).toBeGreaterThan(100);

  await clickVisibleCenterCell(page, "ED-0003", "quickNote");
  await expect(page.getByRole("dialog", { name: "Edit Quick Note" })).toBeVisible();
  await expect.poll(() => readHorizontalScroll(viewport)).toBeLessThan(220);
  await expect.poll(() => editorCellOffset(page, "quickNote", "ED-0003")).toBeLessThanOrEqual(2);

  await expect.poll(() => editorPaneGaps(page)).toMatchObject({
    leftGap: expect.any(Number),
    rightGap: expect.any(Number)
  });
  const gaps = await editorPaneGaps(page);
  expect(gaps.leftGap).toBeGreaterThanOrEqual(-1);
  expect(gaps.rightGap).toBeGreaterThanOrEqual(-1);
  expect(gaps.width).toBeGreaterThan(0);
});

test("editing select and checkbox commits preserve horizontal scroll", async ({ page }) => {
  await page.goto("/#F-EDIT");

  const viewport = page.locator(".og-grid__body-viewport").first();
  await setHorizontalScroll(viewport, 260);
  await expect.poll(() => readHorizontalScroll(viewport)).toBeGreaterThan(100);

  await openEditor(page, "status");
  const statusEditor = editorControl(page, "Status");
  await expect(statusEditor).toBeVisible();
  await expect(statusEditor).toHaveJSProperty("tagName", "SELECT");
  await statusEditor.selectOption("Approved");
  await page.keyboard.press("Enter");
  await expect(cell(page, "status")).toHaveText("Approved");
  await expect.poll(() => readHorizontalScroll(viewport)).toBeGreaterThan(100);

  await cell(page, "active").click();
  await expect(activeDisplayCheckbox(page)).not.toBeChecked();
  await expect.poll(() => readHorizontalScroll(viewport)).toBeGreaterThan(100);
});

async function editText(page: Page, field: string, value: string): Promise<void> {
  await openEditor(page, field);
  await editorControl(page, headerFor(field)).fill(value);
  await page.keyboard.press("Enter");
}

async function openEditor(page: Page, field: string): Promise<void> {
  await cell(page, field).dblclick();
  await expect(page.getByRole("dialog", { name: `Edit ${headerFor(field)}` })).toBeVisible();
}

function cell(page: Page, field: string) {
  return cellFor(page, "ED-0001", field);
}

function cellFor(page: Page, rowKey: string, field: string) {
  return page.locator(`[data-layout-section="body"] [data-field="${field}"][data-edit-row-key="${rowKey}"]`).first();
}

function activeDisplayCheckbox(page: Page) {
  return cell(page, "active").locator('input[type="checkbox"]').first();
}

async function clickVisibleCenterCell(page: Page, rowKey: string, field: string): Promise<void> {
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

function editorControl(page: Page, header: string) {
  return page.locator(`.og-grid__editor-overlay [aria-label="Edit ${header}"]`).first();
}

async function editorPaneGaps(page: Page): Promise<{
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

async function focusedCellPaneGaps(page: Page): Promise<{
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

async function editorCellOffset(page: Page, field: string, rowKey = "ED-0001"): Promise<number> {
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

function summaryValue(page: Page, label: string) {
  return page
    .getByLabel("Editing summary")
    .locator(`xpath=.//dt[normalize-space(.)="${label}"]/following-sibling::dd[1]`);
}

async function setHorizontalScroll(
  locator: Locator,
  scrollLeft: number
): Promise<void> {
  await locator.evaluate((element, nextScrollLeft) => {
    element.scrollLeft = nextScrollLeft;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  }, scrollLeft);
}

async function readHorizontalScroll(locator: Locator): Promise<number> {
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
