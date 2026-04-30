import { expect, test } from "@playwright/test";

test("editing example visual smoke @visual", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await page.locator('[data-field="status"][data-edit-row-key="ED-0001"]').first().dblclick();
  await expect(page.getByRole("dialog", { name: "Edit Status" })).toBeVisible();
  await expect(page).toHaveScreenshot("editing-grid.png");
});
