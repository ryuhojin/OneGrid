import { expect, test } from "@playwright/test";

test("cell merge exposes span metadata and hides covered cells @a11y", async ({ page }) => {
  await page.goto("/#LAY-004");

  const grid = page.getByRole("grid");
  const mergedRegion = page.locator('[data-cell-span-kind="value"][data-column-id="region"]').first();
  const coveredMemo = page.locator('[data-merged-by="custom:0:memo"]').first();

  await expect(grid).toHaveAttribute("aria-colcount", "8");
  await expect(mergedRegion).toHaveAttribute("aria-rowspan", "3");
  await expect(coveredMemo).toHaveAttribute("role", "presentation");
  await expect(coveredMemo).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("gridcell", { name: "Server hold" })).toHaveAttribute("aria-rowspan", "2");
});
