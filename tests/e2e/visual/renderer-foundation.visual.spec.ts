import { expect, test } from "@playwright/test";

test("renderer foundation example visual smoke @visual", async ({ page }) => {
  await page.goto("/#DOM-001");

  await expect(page.locator(".og-grid-shell")).toHaveScreenshot("renderer-foundation-grid.png");
});
