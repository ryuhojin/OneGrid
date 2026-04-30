import { expect, test } from "@playwright/test";

test("pagination example visual smoke @visual", async ({ page }) => {
  await page.goto("/#F-PAGE");

  await expect(page.getByRole("grid", { name: "Client pagination grid" })).toContainText(
    "PAGE-0001"
  );
  await expect(page.locator(".og-grid-shell").first()).toHaveScreenshot("pagination-grid.png");
});
