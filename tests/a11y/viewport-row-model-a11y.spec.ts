import { expect, test } from "@playwright/test";

test("viewport row model exposes logical row count and viewport actions @a11y", async ({ page }) => {
  await page.goto("/#ROW-004");

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "10000000");
  await expect(grid).toHaveAttribute("aria-colcount", "5");
  await expect(page.getByRole("button", { name: "Jump viewport" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply live update" })).toBeVisible();
});
