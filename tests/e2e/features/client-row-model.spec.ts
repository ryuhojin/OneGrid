import { expect, test } from "@playwright/test";

test("client row model example renders filtered sorted grouped aggregate rows", async ({ page }) => {
  await page.goto("/#ROW-001");

  await expect(page.getByRole("heading", { name: "Client row model" })).toBeVisible();
  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "7");

  await expect(grid).toContainText("region: Seoul (2 rows) | Amount Total 1870 | Order Count 2");
  await expect(grid).toContainText("region: Busan (1 rows) | Amount Total 910 | Order Count 1");
  await expect(grid).toContainText("region: Incheon (1 rows) | Amount Total 430 | Order Count 1");
  await expect(grid).toContainText("National Treasury");
  await expect(grid).toContainText("Metro Finance Office");
  await expect(grid).not.toContainText("Audit Archive");

  const visibleDataKeys = await page
    .locator(".og-grid__row[data-row-key^='ORD-']")
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-row-key")));
  expect(visibleDataKeys).toEqual(["ORD-5101", "ORD-5103", "ORD-5102", "ORD-5105"]);

  const summary = page.getByLabel("Client row model summary");
  await expect(summary).toContainText("Source rows");
  await expect(summary).toContainText("5");
  await expect(summary).toContainText("Filtered rows");
  await expect(summary).toContainText("4");
  await expect(summary).toContainText("Aggregate amount");
  await expect(summary).toContainText("3210");
});
