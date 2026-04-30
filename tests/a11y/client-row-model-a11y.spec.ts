import { expect, test } from "@playwright/test";

test("client row model exposes grouped rows through grid roles @a11y", async ({ page }) => {
  await page.goto("/#ROW-001");

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "7");
  await expect(grid).toHaveAttribute("aria-colcount", "6");
  await expect(page.getByRole("gridcell", { name: /region: Seoul/ })).toBeVisible();
});
