import { expect, test } from "@playwright/test";

test("server row model exposes grid roles and server actions @a11y", async ({ page }) => {
  await page.goto("/#ROW-003");

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "4");
  await expect(grid).toHaveAttribute("aria-colcount", "5");
  await expect(page.getByRole("button", { name: "Expand Daejeon group" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh server rows" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply transaction" })).toBeVisible();
});
