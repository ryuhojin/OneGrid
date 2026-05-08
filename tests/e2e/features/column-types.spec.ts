import { expect, test } from "@playwright/test";

test("column types example renders typed and formatted columns", async ({ page }) => {
  await page.goto("/#EX-001-002");

  await expect(page.getByRole("heading", { name: "Column types" })).toBeVisible();
  await expect(page.getByRole("grid", { name: "Column types grid" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Text" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Date" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Number" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Boolean" })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "May 1, 2026" })).toBeVisible();
  await expect(page.getByText("1,280,000")).toBeVisible();
  await expect(page.getByText("82%")).toBeVisible();
  await expect(page.getByText("Active").first()).toBeVisible();
  await expect(page.getByText("High")).toBeVisible();
});
