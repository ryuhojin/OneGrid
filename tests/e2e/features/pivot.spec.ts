import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

test("pivot example renders client row, column, value, subtotal, and total fields", async ({ page }) => {
  await page.goto("/#F-PIVOT");

  const grid = page.getByRole("grid", { name: "Client pivot grid" });
  await expect(grid).toHaveAttribute("aria-colcount", "8");
  await expect(grid).toHaveAttribute("aria-rowcount", "8");
  await expect(grid.getByRole("columnheader", { name: "Q1" })).toBeVisible();
  await expect(grid.getByRole("columnheader", { name: "Total" })).toBeVisible();

  await expect(pivotCell(grid, "Capital|Treasury%20Office", "pivot:Q1:amountTotal"))
    .toHaveText("1200");
  await expect(pivotCell(grid, "Capital|Treasury%20Office", "pivot:Q2:amountTotal"))
    .toHaveText("800");
  await expect(pivotCell(grid, "subtotal:Capital", "pivot:Q1:amountTotal"))
    .toHaveText("1200");
  await expect(pivotCell(grid, "grand-total", "pivot:total:amountTotal"))
    .toHaveText("4730");

  await page.getByRole("button", { name: "Pivot" }).first().click();
  const panel = page.getByRole("region", { name: "Pivot panel" }).first();
  await expect(panel).toContainText("quarter");
  await expect(panel).toContainText("amountTotal:sum");

  await page.getByRole("button", { name: "Clear client filter" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "9");
  await expect(summaryValue(page, "Client filtered source rows")).toHaveText("8");
});

test("pivot example sends the same pivot model to server row requests", async ({ page }) => {
  await page.goto("/#F-PIVOT");

  const grid = page.getByRole("grid", { name: "Server pivot grid" });
  await expect(grid).toHaveAttribute("aria-rowcount", "4");
  await expect(pivotCell(grid, "srv-capital", "pivot:total:amountTotal")).toHaveText("2000");
  await expect(summaryValue(page, "Server pivot requests")).toHaveText("1");
  await expect(summaryValue(page, "Server pivot rows")).toHaveText("region, agency");
  await expect(summaryValue(page, "Server pivot columns")).toHaveText("quarter");
  await expect(summaryValue(page, "Server pivot values"))
    .toHaveText("amountTotal:sum, avgBudget:avg");
});

function pivotCell(grid: Locator, rowKey: string, field: string): Locator {
  return grid.locator(`[data-row-key="${rowKey}"] [data-field="${field}"]`);
}

function summaryValue(page: Page, label: string): Locator {
  return page
    .getByLabel("Pivot summary")
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd[1]");
}
