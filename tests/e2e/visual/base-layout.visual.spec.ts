import { expect, test } from "@playwright/test";

test("base layout example visual smoke @visual", async ({ page }) => {
  await page.goto("/#LAY-001");

  await expect(page.getByRole("grid")).toContainText("Rows: 4");
  await expect(page.getByRole("grid")).toHaveScreenshot("base-layout-grid.png");
});
