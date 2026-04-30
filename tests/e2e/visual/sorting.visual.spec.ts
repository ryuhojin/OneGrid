import { expect, test } from "@playwright/test";

test("sorting example visual smoke @visual", async ({ page }) => {
  await page.goto("/#F-SORT");

  await page.locator('[role="columnheader"][data-source-id="amount"]').click();
  await expect(page.getByRole("grid")).toHaveScreenshot("sorting-grid.png");
});
