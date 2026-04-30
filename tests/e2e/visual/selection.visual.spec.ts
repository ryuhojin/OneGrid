import { expect, test } from "@playwright/test";

test("selection example visual smoke @visual", async ({ page }) => {
  await page.goto("/#F-SELECT");

  await page.getByLabel("Select row SEL-0001").check();
  await page.locator('[data-edit-row-key="SEL-0001"][data-field="agency"]').first().click();
  await page.keyboard.down("Shift");
  await page.locator('[data-edit-row-key="SEL-0002"][data-field="memo"]').first().click();
  await page.keyboard.up("Shift");

  await expect(page).toHaveScreenshot("selection-grid.png");
});
