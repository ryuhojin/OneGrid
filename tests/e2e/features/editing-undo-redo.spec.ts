import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("editing undo and redo update staged values and pending history", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await editText(page, "title", "Undo title");
  await expect(cell(page, "title")).toHaveText("Undo title");
  await expect(summaryValue(page, "Pending edits")).toHaveText("1");
  await expect(summaryValue(page, "Undo stack")).toHaveText("1");
  await expect(summaryValue(page, "Redo stack")).toHaveText("0");

  await page.getByRole("button", { name: "Undo edit" }).click();

  await expect(cell(page, "title")).toHaveText("Budget approval");
  await expect(summaryValue(page, "Pending edits")).toHaveText("0");
  await expect(summaryValue(page, "Undo stack")).toHaveText("0");
  await expect(summaryValue(page, "Redo stack")).toHaveText("1");
  await expect(summaryValue(page, "Last history")).toContainText("undo:title");

  await page.getByRole("button", { name: "Redo edit" }).click();

  await expect(cell(page, "title")).toHaveText("Undo title");
  await expect(summaryValue(page, "Pending edits")).toHaveText("1");
  await expect(summaryValue(page, "Undo stack")).toHaveText("1");
  await expect(summaryValue(page, "Redo stack")).toHaveText("0");
  await expect(summaryValue(page, "Last history")).toContainText("redo:title");
  await expect(summaryValue(page, "Pending detail")).toContainText("Budget approval -> Undo title");
});

test("editing undo preserves previous steps on repeated edits to the same cell", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await editText(page, "title", "First title");
  await editText(page, "title", "Second title");
  await expect(cell(page, "title")).toHaveText("Second title");
  await expect(summaryValue(page, "Pending detail")).toContainText("Budget approval -> Second title");
  await expect(summaryValue(page, "Undo stack")).toHaveText("2");

  await page.getByRole("button", { name: "Undo edit" }).click();

  await expect(cell(page, "title")).toHaveText("First title");
  await expect(summaryValue(page, "Pending detail")).toContainText("Budget approval -> First title");
  await expect(summaryValue(page, "Undo stack")).toHaveText("1");
  await expect(summaryValue(page, "Redo stack")).toHaveText("1");
});

test("editing cancel clears redo history for the cancelled batch", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await editText(page, "title", "Cancelled title");
  await page.getByRole("button", { name: "Undo edit" }).click();
  await expect(summaryValue(page, "Redo stack")).toHaveText("1");

  await page.getByRole("button", { name: "Cancel changes" }).click();

  await expect(cell(page, "title")).toHaveText("Budget approval");
  await expect(summaryValue(page, "Pending edits")).toHaveText("0");
  await expect(summaryValue(page, "Undo stack")).toHaveText("0");
  await expect(summaryValue(page, "Redo stack")).toHaveText("0");
  await page.getByRole("button", { name: "Redo edit" }).click();
  await expect(cell(page, "title")).toHaveText("Budget approval");
});

async function editText(page: Page, field: string, value: string): Promise<void> {
  await cell(page, field).dblclick();
  await expect(page.getByRole("dialog", { name: `Edit ${headerFor(field)}` })).toBeVisible();
  await page.locator(`.og-grid__editor-overlay [aria-label="Edit ${headerFor(field)}"]`).fill(value);
  await page.keyboard.press("Enter");
}

function cell(page: Page, field: string) {
  return page.locator(`[data-layout-section="body"] [data-field="${field}"][data-edit-row-key="ED-0001"]`).first();
}

function summaryValue(page: Page, label: string) {
  return page
    .getByLabel("Editing summary")
    .locator(`xpath=.//dt[normalize-space(.)="${label}"]/following-sibling::dd[1]`);
}

function headerFor(field: string): string {
  const headers: Readonly<Record<string, string>> = {
    title: "Title"
  };
  return headers[field] ?? field;
}
