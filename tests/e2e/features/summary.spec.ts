import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

test("summary example renders labeled client and server summaries", async ({ page }) => {
  await page.goto("/#F-SUMMARY");

  const grid = page.getByRole("grid", { name: "Client summary grid" });
  await expect(grid.locator('[data-layout-section="summary"]')).toHaveCount(1);
  await expect(grid.locator('[data-summary-position="top"]')).toBeVisible();

  await expect(summaryCell(grid, "id").first()).toHaveAttribute("data-summary-label", "Rows");
  await expect(summaryCell(grid, "id").first()).toHaveAttribute("data-summary-value", "8");
  await expect(summaryCell(grid, "region").first()).toHaveAttribute("data-summary-label", "Regions");
  await expect(summaryCell(grid, "region").first()).toHaveAttribute("data-summary-value", "3");
  await expect(summaryCell(grid, "amount").first()).toHaveAttribute("data-summary-value", "5690");
  await expect(summaryCell(grid, "spent").first()).toHaveAttribute("data-summary-value", "557.50");
  await expect(grid.locator('[data-column-id="min-risk"]').first())
    .toHaveAttribute("data-summary-value", "12");
  await expect(grid.locator('[data-column-id="max-risk"]').first())
    .toHaveAttribute("data-summary-value", "42");
  await expect(summaryCell(grid, "status").first()).toHaveAttribute("data-summary-label", "Reviews");
  await expect(summaryCell(grid, "status").first()).toHaveAttribute("data-summary-value", "3");
});

test("summary example renders group and server aggregate values", async ({ page }) => {
  await page.goto("/#F-SUMMARY");

  const clientGrid = page.getByRole("grid", { name: "Client summary grid" });
  await expect(clientGrid).toContainText("region: Capital (3 rows) | Amount Total 2430");

  const serverGrid = page.getByRole("grid", { name: "Server aggregate grid" });
  await expect(serverGrid).toContainText("Rows: 8");
  await expect(serverGrid.locator('[data-summary-position="bottom"]')).toBeVisible();
  await expect(summaryCell(serverGrid, "amount").first()).toHaveAttribute("data-summary-value", "5690");
  await expect(summaryCell(serverGrid, "status").first()).toHaveAttribute("data-summary-value", "3");
  await expect(summaryValue(page, "Server aggregate requests")).toHaveText("1");
  await expect(summaryValue(page, "Last server aggregate model")).toContainText("amountTotal:sum");
});

function summaryCell(grid: Locator, field: string): Locator {
  return grid.locator(`[data-layout-section="summary"] [data-summary-field="${field}"]`);
}

function summaryValue(page: Page, label: string) {
  return page
    .getByLabel("Summary aggregate summary")
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd[1]");
}
