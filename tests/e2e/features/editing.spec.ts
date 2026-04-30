import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

test("editing example stages every bundled editor kind and commits through toolbar", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await editText(page, "title", "Revised budget");
  await expect(cell(page, "title")).toHaveText("Revised budget");
  await expect(summaryValue(page, "Pending edits")).toHaveText("1");
  await expect(summaryValue(page, "Commits")).toHaveText("0");

  await editText(page, "budget", "1250000");
  await expect(cell(page, "budget")).toHaveText("1250000");

  await openEditor(page, "active");
  await editorControl(page, "Active").uncheck();
  await page.keyboard.press("Enter");
  await expect(activeDisplayCheckbox(page)).not.toBeChecked();
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

  await page.getByRole("button", { name: "Edit title" }).click();
  const titleEditor = editorControl(page, "Title");
  await expect(titleEditor).toBeFocused();
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
  await openEditor(page, "active");
  await editorControl(page, "Active").uncheck();
  await page.keyboard.press("Enter");

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

test("editing overlay fits the cell and checkbox editor is browser-stable", async ({ page }) => {
  await page.goto("/#F-EDIT");

  const activeCell = cell(page, "active");
  const displayBox = await activeDisplayCheckbox(page).boundingBox();
  await activeCell.dblclick();
  const dialog = page.getByRole("dialog", { name: "Edit Active" });
  await expect(dialog).toBeVisible();

  const cellBox = await activeCell.boundingBox();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(cellBox).not.toBeNull();
  expect(dialogBox?.width ?? 0).toBeLessThanOrEqual((cellBox?.width ?? 0) + 1);

  const checkbox = editorControl(page, "Active");
  await expect(checkbox).toHaveClass(/og-grid__editor-native-checkbox/);
  await expect(checkbox).toBeChecked();
  const checkboxBox = await checkbox.boundingBox();
  expect(displayBox).not.toBeNull();
  expect(checkboxBox).not.toBeNull();
  expect(Math.abs((checkboxBox?.x ?? 0) - (displayBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((checkboxBox?.y ?? 0) - (displayBox?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(checkboxBox?.width ?? 0).toBeGreaterThanOrEqual(14);
  expect(checkboxBox?.height ?? 0).toBeGreaterThanOrEqual(14);

  await checkbox.press("Space");
  await page.keyboard.press("Enter");
  await expect(activeDisplayCheckbox(page)).not.toBeChecked();
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

  await openEditor(page, "active");
  const activeEditor = editorControl(page, "Active");
  await expect(activeEditor).toHaveClass(/og-grid__editor-native-checkbox/);
  await activeEditor.press("Space");
  await page.keyboard.press("Enter");
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
  return page.locator(`[data-layout-section="body"] [data-field="${field}"][data-edit-row-key="ED-0001"]`).first();
}

function activeDisplayCheckbox(page: Page) {
  return cell(page, "active").locator('input[type="checkbox"]').first();
}

function editorControl(page: Page, header: string) {
  return page.locator(`.og-grid__editor-overlay [aria-label="Edit ${header}"]`).first();
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
    code: "Code"
  };
  return headers[field] ?? field;
}
