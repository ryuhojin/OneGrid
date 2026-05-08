import { expect, test } from "@playwright/test";

const routes = [
  "EX-005-001",
  "EX-005-002",
  "EX-005-003",
  "EX-005-004",
  "EX-005-005",
  "EX-005-006",
  "EX-005-007",
  "EX-005-008"
] as const;

test("EX-005 quality/security/performance routes expose accessible grids @a11y", async ({ page }) => {
  for (const route of routes) {
    await page.goto(`/#${route}`);
    const grid = page.locator('[role="grid"], [role="treegrid"]').first();
    await expect(grid).toBeVisible();
    await expect(grid).toHaveAttribute("aria-rowcount", /[1-9][0-9]*/);
    await expect(grid).toHaveAttribute("aria-colcount", /[1-9][0-9]*/);
  }
});
