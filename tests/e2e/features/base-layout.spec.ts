import { expect, test } from "@playwright/test";

test("base layout renders pinned panes, summary row, footer, and overlay host", async ({ page }) => {
  await page.goto("/#LAY-001");

  await expect(page.getByRole("heading", { name: "Base layout" })).toBeVisible();

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "4");
  await expect(grid.getByRole("columnheader", { name: "ID" })).toBeVisible();
  await expect(grid.getByRole("columnheader", { name: "Status" })).toBeVisible();
  await expect(grid).toContainText("Treasury Review Board");
  await expect(grid).toContainText("3370000");
  await expect(grid).toContainText("Rows: 4");

  await expect(page.locator('[data-layout-section="header"]')).toBeVisible();
  await expect(page.locator('[data-layout-section="body"]')).toBeVisible();
  await expect(page.locator('[data-layout-section="summary"]')).toBeVisible();
  await expect(page.locator('[data-layout-section="footer"]')).toBeVisible();
  await expect(page.locator('[data-layout-section="footer"] [data-layout-pane]')).toHaveCount(0);
  await expect(page.locator('[data-layout-section="overlay"]')).toBeAttached();
  await expect(page.locator('[data-layout-pane="left"]').first()).toBeVisible();
  await expect(page.locator('[data-layout-pane="right"]').first()).toBeVisible();
});
