import { expect, test } from "@playwright/test";

test("EX-002 block merge exposes one accessible anchor and covered presentations @a11y", async ({ page }) => {
  await page.goto("/#EX-002-005");

  const grid = page.getByRole("grid", { name: "Cell merge block grid" });
  await expect(grid).toHaveAttribute("aria-rowcount", "6");
  await expect(grid).toHaveAttribute("aria-colcount", "6");
  await expect(page.getByRole("gridcell", { name: "Joint review window" })).toHaveAttribute("aria-rowspan", "2");
  await expect(page.locator('[data-merged-by="custom:0:review"]').first()).toHaveAttribute("role", "presentation");
});

test("EX-002 variable row height keeps grid semantics @a11y", async ({ page }) => {
  await page.goto("/#EX-002-008");

  const grid = page.getByRole("grid", { name: "Variable row height grid" });
  await expect(grid).toHaveAttribute("aria-rowcount", "48");
  await expect(grid).toHaveAttribute("aria-colcount", "5");
  await expect(page.getByRole("gridcell", { name: /Longer memo/ })).toBeVisible();
});
