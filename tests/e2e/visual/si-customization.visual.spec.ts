import { expect, test } from "@playwright/test";

const visualCases = ["Public red", "Civic blue", "Neutral audit", "BNK red", "BNK gold", "BNK gray"] as const;

for (const label of visualCases) {
  test(`SI customization ${label} visual regression @visual`, async ({ page }) => {
    await page.goto("/#THEME-002");
    await page.getByRole("button", { name: label }).click();

    await expect(page.locator("#THEME-002")).toHaveScreenshot(
      `si-customization-${label.toLowerCase().replaceAll(" ", "-")}.png`
    );
  });
}
