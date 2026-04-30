import { expect, test } from "@playwright/test";

test("row virtualization exposes logical row count and bounded rendered rows @a11y", async ({ page }) => {
  await page.goto("/#LAY-002");

  const grid = page.getByRole("grid");
  const bodyRows = page.locator('[data-layout-section="body"] [data-layout-pane="center"] [data-row-key]');

  await expect(grid).toHaveAttribute("aria-rowcount", "50000");
  await expect(grid).toHaveAttribute("aria-colcount", "5");
  await expect(page.getByRole("button", { name: "Scroll to row 2500" })).toBeVisible();
  await expect.poll(async () => bodyRows.count()).toBeLessThanOrEqual(64);
});
