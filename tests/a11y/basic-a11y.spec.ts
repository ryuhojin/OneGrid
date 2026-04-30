import { expect, test } from "@playwright/test";

test("basic grid exposes required ARIA roles @a11y", async ({ page }) => {
  await page.goto("/");

  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();
  await expect(grid).toHaveAttribute("aria-rowcount", "3");
  await expect(grid).toHaveAttribute("aria-colcount", "4");
  await expect(page.getByRole("columnheader", { name: "Customer" })).toBeVisible();
});
