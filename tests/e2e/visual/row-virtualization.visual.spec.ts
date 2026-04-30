import { expect, test } from "@playwright/test";

test("row virtualization example visual smoke @visual", async ({ page }) => {
  await page.goto("/#LAY-002");

  await expect(page.getByRole("grid")).toHaveScreenshot("row-virtualization-grid.png");
});
