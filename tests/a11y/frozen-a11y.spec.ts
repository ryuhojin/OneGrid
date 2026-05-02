import { expect, test } from "@playwright/test";

test("frozen rows and columns expose rowgroups and bounded virtual rows @a11y", async ({ page }) => {
  await page.goto("/#F-FROZEN");

  const grid = page.getByRole("grid");
  const frozenSections = page.locator('[data-layout-section="frozen"]');

  await expect(grid).toHaveAttribute("aria-rowcount", "240");
  await expect(grid).toHaveAttribute("data-virtualized-rows", "true");
  await expect(frozenSections).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Scroll to row 120" })).toBeVisible();
});
