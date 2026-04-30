import { expect, test } from "@playwright/test";

test("infinite row model example visual smoke @visual", async ({ page }) => {
  await page.goto("/#ROW-002");

  await expect(page.getByRole("grid")).toContainText("ORD-0000001");
  await expect(page.getByRole("grid")).toHaveScreenshot("infinite-row-model-grid.png");
});
