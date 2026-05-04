import { expect, test } from "@playwright/test";

test("theme foundation scoped enterprise palette visual smoke @visual", async ({ page }) => {
  await page.goto("/#THEME-001");

  await page.getByRole("button", { name: "BNK scoped" }).click();
  await expect(page.locator("#THEME-001")).toHaveScreenshot("theme-foundation-bnk.png");
});
