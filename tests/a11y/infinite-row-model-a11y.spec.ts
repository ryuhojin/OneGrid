import { expect, test } from "@playwright/test";

test("infinite row model exposes logical row count and loading controls @a11y", async ({ page }) => {
  await page.goto("/#ROW-002");

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "1000000");
  await expect(grid).toHaveAttribute("aria-colcount", "5");
  await expect(grid).toContainText("ORD-0000001");
  await expect(page.getByRole("button", { name: "Load more rows" })).toBeVisible();
});
