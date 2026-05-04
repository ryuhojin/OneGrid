import { expect, test } from "@playwright/test";

test("localization example visual smoke @visual", async ({ page }) => {
  await page.goto("/#F-I18N");

  await page.getByRole("button", { name: "한국어" }).click();
  await expect(page.locator("#F-I18N")).toHaveScreenshot("localization-grid.png");
});
