import { expect, test } from "@playwright/test";

test("client row model example visual smoke @visual", async ({ page }) => {
  await page.goto("/#ROW-001");

  await expect(page.getByRole("grid")).toHaveScreenshot("client-row-model-grid.png");
});
