import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

test("read-only editing requests external state updates without staging", async ({ page }) => {
  await page.goto("/#F-EDIT");

  const external = page.getByTestId("external-editing-example");
  const grid = external.locator('[data-testid="external-edit-grid"]');
  const titleCell = externalCell(grid, "ED-0001", "title");

  await expect(externalSummary(page, "External requests")).toHaveText("0");
  await titleCell.dblclick();
  await expect(page.getByRole("dialog", { name: "Edit Title" })).toBeVisible();

  await page.locator('.og-grid__editor-overlay [aria-label="Edit Title"]').fill("Externally owned title");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("dialog", { name: "Edit Title" })).toBeHidden();
  await expect(externalSummary(page, "External requests")).toHaveText("1");
  await expect(externalSummary(page, "External last")).toHaveText("enter:title:Externally owned title");
  await expect(externalSummary(page, "External row title")).toHaveText("Externally owned title");
  await expect(titleCell).toHaveText("Externally owned title");
  await expect(page.getByLabel("Editing summary").locator("text=Externally owned title")).toHaveCount(0);

  await externalCell(grid, "ED-0001", "active").click();
  await expect(externalSummary(page, "External requests")).toHaveText("2");
  await expect(externalSummary(page, "External last")).toHaveText("pointer:active:false");
  await expect(externalCell(grid, "ED-0001", "active").locator('input[type="checkbox"]')).not.toBeChecked();
});

function externalCell(grid: Locator, rowKey: string, field: string) {
  return grid.locator(`[data-layout-section="body"] [data-field="${field}"][data-edit-row-key="${rowKey}"]`).first();
}

function externalSummary(page: Page, label: string) {
  return page
    .getByLabel("External state request summary")
    .locator(`xpath=.//dt[normalize-space(.)="${label}"]/following-sibling::dd[1]`);
}
