import { expect, test } from "@playwright/test";

test("group header example renders merged headers and clipped metadata", async ({ page }) => {
  await page.goto("/#COL-002");

  await expect(page.getByRole("heading", { name: "Group header" })).toBeVisible();
  await expect(page.locator('[data-header-label-id="financial-merge-label"]')).toHaveText(
    "Financial Metrics"
  );
  await expect(page.getByRole("columnheader", { name: "ID" })).toHaveAttribute("aria-rowspan", "3");
  await expect(page.getByRole("columnheader", { name: "Status" })).toHaveAttribute("aria-rowspan", "3");
  await expect(page.getByRole("columnheader", { name: "Portfolio, spans 3 columns" })).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Financial, spans 2 columns, Financial Metrics" })
  ).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Audit Note" })).toHaveCount(0);

  const summary = page.getByLabel("Group header summary");
  await expect(summary).toContainText("Header rows");
  await expect(summary).toContainText("Metric columns");
  await expect(summary).toContainText("Amount, Tax");
  await expect(summary).toContainText("Portfolio");
  await expect(summary).toContainText("Portfolio, spans 3 columns");
});
