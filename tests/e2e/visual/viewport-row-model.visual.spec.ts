import { expect, test } from "@playwright/test";

test("viewport row model example visual smoke @visual", async ({ page }) => {
  await page.goto("/#ROW-004");

  await expect(page.getByRole("grid")).toContainText("ORD-VP-0000001");
  await expect(page.getByRole("grid")).toHaveScreenshot("viewport-row-model-grid.png");
});
