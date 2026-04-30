import { expect, test } from "@playwright/test";

test("keyboard focus example visual smoke @visual", async ({ page }) => {
  await page.goto("/#DOM-002");

  await page.getByRole("gridcell", { name: "KF-0001" }).click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");

  await expect(page.getByRole("grid")).toHaveScreenshot("keyboard-focus-grid.png");
});
