import { expect, test } from "@playwright/test";

test("filtering example visual smoke @visual", async ({ page }) => {
  await page.goto("/#F-FILTER");

  await page.getByLabel("Column menu Status").click();
  await page.getByRole("menuitem", { name: "Filter Status" }).click();
  const filterDialog = page.getByRole("dialog", { name: "Filter Status" });
  await expect(filterDialog).toBeVisible();

  await expect(page.locator("#F-FILTER")).toHaveScreenshot("filtering-example.png");
  await expect(filterDialog).toHaveScreenshot("filtering-status-dialog.png");
});
