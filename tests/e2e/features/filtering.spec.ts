import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("filtering example applies quick filter through server row model", async ({ page }) => {
  await page.goto("/#F-FILTER");

  await page.getByLabel("Quick filter").fill("clinic");

  await expect(page.locator('[data-layout-section="body"] [data-column-id="id"]').first())
    .toHaveText("FL-0006");
  await expect(page.getByLabel("Filtering summary")).toContainText("quick:clinic");
  await expect(page.getByRole("grid")).toContainText("Rows: 1");
});

test("filtering example applies text, number, date, boolean, and custom column filters", async ({ page }) => {
  await page.goto("/#F-FILTER");

  await openColumnFilter(page, "Agency");
  await page.getByLabel("Agency filter operator 1").selectOption("startsWith");
  await page.getByLabel("Agency filter value 1").fill("Public");
  await page.getByLabel("Apply Agency filter").click();
  await expect(page.locator('[data-layout-section="body"] [data-column-id="id"]').first())
    .toHaveText("FL-0006");

  await page.reload();
  await openColumnFilter(page, "Amount");
  await page.getByLabel("Amount filter operator 1").selectOption(">=");
  await page.getByLabel("Amount filter value 1").fill("700000");
  await page.getByLabel("Amount filter operator 2").selectOption("<=");
  await page.getByLabel("Amount filter value 2").fill("1000000");
  await page.getByLabel("Apply Amount filter").click();
  await expect(page.getByRole("grid")).toContainText("FL-0002");
  await expect(page.getByRole("grid")).toContainText("Rows: 5");

  await page.reload();
  await openColumnFilter(page, "Due Date");
  await page.getByLabel("Due Date filter operator 1").selectOption(">");
  await page.getByLabel("Due Date filter value 1").fill("2026-06-01");
  await page.getByLabel("Apply Due Date filter").click();
  await expect(page.locator('[data-layout-section="body"] [data-column-id="id"]').first())
    .toHaveText("FL-0004");

  await page.reload();
  await openColumnFilter(page, "Urgent");
  await page.getByLabel("Urgent filter value").selectOption("true");
  await page.getByLabel("Apply Urgent filter").click();
  await expect(page.locator('[data-layout-section="body"] [data-column-id="id"]').first())
    .toHaveText("FL-0002");

  await page.reload();
  await openColumnFilter(page, "Service");
  await page.getByLabel("Service filter value 1").fill("cloud");
  await page.getByLabel("Apply Service filter").click();
  await expect(page.locator('[data-layout-section="body"] [data-column-id="id"]').first())
    .toHaveText("FL-0008");
});

test("filtering example applies set filter with distinct values from data source", async ({ page }) => {
  await page.goto("/#F-FILTER");

  await openColumnFilter(page, "Status");
  await expect(page.getByRole("dialog", { name: "Filter Status" })).toBeVisible();
  await expect(page.getByLabel("Filtering summary")).toContainText("Distinct values requests");

  await page.getByLabel("Review").uncheck();
  await page.getByLabel("Blocked").uncheck();
  await page.getByLabel("Apply Status filter").click();

  await expect(page.locator('[data-layout-section="body"] [data-column-id="status"]').first())
    .toHaveText("Approved");
  await expect(page.getByRole("grid")).toContainText("Rows: 5");
  await expect(page.getByLabel("Filtering summary")).toContainText("status:in:Approved");
});

async function openColumnFilter(page: Page, headerName: string): Promise<void> {
  await page.getByLabel(`Column menu ${headerName}`).click();
  await page.getByRole("menuitem", { name: `Filter ${headerName}` }).click();
  await expect(page.getByRole("dialog", { name: `Filter ${headerName}` })).toBeVisible();
}
