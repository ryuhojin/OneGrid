import { expect, test } from "@playwright/test";

test("column model example renders ordered visible columns and metadata", async ({ page }) => {
  await page.goto("/#COL-001");

  await expect(page.getByRole("heading", { name: "Column model" })).toBeVisible();
  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();

  await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "ID" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Customer" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Audit Note" })).toHaveCount(0);

  const summary = page.getByLabel("Column model summary");
  await expect(summary).toContainText("status, order-id, customer, region, amount");
  await expect(summary).toContainText("auditNote");
  await expect(summary).toContainText("Pinned left columns");
  await expect(summary).toContainText("Pinned right columns");
});
