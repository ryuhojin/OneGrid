import { expect, test } from "@playwright/test";

test("column UI example visual smoke @visual", async ({ page }) => {
  await page.goto("/#COL-003");
  await page.getByRole("button", { name: "Columns" }).click();

  await expect(page.locator(".og-grid-shell")).toHaveScreenshot("column-ui-grid.png");
});
