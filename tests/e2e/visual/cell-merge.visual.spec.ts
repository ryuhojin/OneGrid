import { expect, test } from "@playwright/test";

test("cell merge example visual smoke @visual", async ({ page }) => {
  await page.goto("/#LAY-004");

  await expect(page.locator('[data-cell-span-kind="server"][data-column-id="status"]').first())
    .toBeVisible();
  await expect(page.getByRole("grid")).toHaveScreenshot("cell-merge-grid.png");
});
