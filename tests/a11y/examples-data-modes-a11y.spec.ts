import { expect, test } from "@playwright/test";

test("EX-003 data mode routes expose grid semantics @a11y", async ({ page }) => {
  const cases = [
    { id: "EX-003-001", role: "grid", rowCount: "7", colCount: "6" },
    { id: "EX-003-002", role: "grid", rowCount: "1000000", colCount: "5" },
    { id: "EX-003-003", role: "grid", rowCount: "4", colCount: "5" },
    { id: "EX-003-004", role: "grid", rowCount: "10000000", colCount: "5" },
    { id: "EX-003-005", role: "treegrid", rowCount: "2", colCount: "4" }
  ] as const;

  for (const scenario of cases) {
    await page.goto(`/#${scenario.id}`);
    const grid = page.getByRole(scenario.role);
    await expect(grid).toHaveAttribute("aria-rowcount", scenario.rowCount);
    await expect(grid).toHaveAttribute("aria-colcount", scenario.colCount);
  }
});
