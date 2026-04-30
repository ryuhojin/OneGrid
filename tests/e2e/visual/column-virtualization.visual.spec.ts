import { expect, test } from "@playwright/test";

test("column virtualization example visual smoke @visual", async ({ page }) => {
  await page.goto("/#LAY-003");

  await page.getByRole("button", { name: "Scroll to M32" }).click();
  await expect(page.getByRole("grid")).toHaveScreenshot("column-virtualization-grid.png");
});
