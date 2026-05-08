import { expect, test } from "@playwright/test";

test("column types example exposes typed grid semantics @a11y", async ({ page }) => {
  await page.goto("/#EX-001-002");

  const grid = page.getByRole("grid", { name: "Column types grid" });
  await expect(grid).toBeVisible();
  await expect(grid).toHaveAttribute("aria-rowcount", "4");
  await expect(grid).toHaveAttribute("aria-colcount", "7");
});
