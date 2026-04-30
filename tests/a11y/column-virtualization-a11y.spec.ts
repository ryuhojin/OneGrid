import { expect, test } from "@playwright/test";

test("column virtualization exposes full column count and bounded rendered cells @a11y", async ({ page }) => {
  await page.goto("/#LAY-003");

  const grid = page.getByRole("grid");
  const firstCenterRow = page
    .locator('[data-layout-section="body"] [data-layout-pane="center"] [data-row-key]')
    .first();

  await expect(grid).toHaveAttribute("aria-colcount", "75");
  await expect(grid).toHaveAttribute("data-virtualized-columns", "true");
  await expect(page.getByRole("button", { name: "Scroll to M32" })).toBeVisible();
  await expect.poll(async () => firstCenterRow.locator('[role="gridcell"]').count()).toBeLessThanOrEqual(10);
});
