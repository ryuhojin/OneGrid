import { expect, test } from "@playwright/test";

test("export import example visual smoke @visual", async ({ page }) => {
  await page.goto("/#F-EXPORT");

  await page.getByRole("button", { name: "Export CSV" }).click();
  await expect(page.locator("#F-EXPORT")).toHaveScreenshot("export-import-example.png");
});
