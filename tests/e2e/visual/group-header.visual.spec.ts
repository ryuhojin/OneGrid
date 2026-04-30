import { expect, test } from "@playwright/test";

test("group header example visual smoke @visual", async ({ page }) => {
  await page.goto("/#COL-002");

  await expect(page.getByRole("grid")).toHaveScreenshot("group-header-grid.png");
});
