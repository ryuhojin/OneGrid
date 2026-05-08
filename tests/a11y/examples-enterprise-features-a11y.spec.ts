import { expect, test } from "@playwright/test";

const routes = [
  "EX-004-001",
  "EX-004-002",
  "EX-004-003",
  "EX-004-004",
  "EX-004-005",
  "EX-004-006",
  "EX-004-007",
  "EX-004-008",
  "EX-004-009",
  "EX-004-010",
  "EX-004-011",
  "EX-004-012",
  "EX-004-013"
] as const;

test("EX-004 enterprise routes expose accessible grid surfaces @a11y", async ({ page }) => {
  for (const route of routes) {
    await page.goto(`/#${route}`);
    const grid = page.locator('[role="grid"], [role="treegrid"]').first();
    await expect(grid).toBeVisible();
    await expect(grid).toHaveAttribute("aria-rowcount", /[1-9][0-9]*/);
    await expect(grid).toHaveAttribute("aria-colcount", /[1-9][0-9]*/);
  }
});
