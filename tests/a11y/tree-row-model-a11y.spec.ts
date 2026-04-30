import { expect, test } from "@playwright/test";

test("tree row model exposes tree expansion and selection controls @a11y", async ({ page }) => {
  await page.goto("/#ROW-005");

  const grid = page.getByRole("treegrid");
  await expect(grid).toHaveAttribute("aria-rowcount", "2");
  await expect(page.getByRole("button", { name: "Expand FIN" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Expand OPS" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Select FIN" })).toBeVisible();
});
