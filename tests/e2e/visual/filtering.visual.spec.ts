import { expect, test } from "@playwright/test";

test("filtering example visual smoke @visual", async ({ page }) => {
  await page.goto("/#F-FILTER");

  await page.getByLabel("Column menu Status").click();
  await page.getByRole("menuitem", { name: "Filter Status" }).click();
  await expect(page.getByRole("dialog", { name: "Filter Status" })).toBeVisible();
  await expect(page).toHaveScreenshot("filtering-grid.png");
});
