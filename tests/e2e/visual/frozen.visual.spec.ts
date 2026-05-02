import { expect, test } from "@playwright/test";

test("frozen rows and columns example visual smoke @visual", async ({ page }) => {
  await page.goto("/#F-FROZEN");

  await page.getByRole("button", { name: "Scroll to row 120" }).click();
  await expect(page.getByRole("grid")).toHaveScreenshot("frozen-grid.png");
});
