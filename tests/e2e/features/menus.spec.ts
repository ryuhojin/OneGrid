import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("menus example opens header, column, and filter menus", async ({ page }) => {
  await page.goto("/#F-MENU");

  const menuButton = page.getByLabel("Column menu Department");
  await menuButton.click();

  const menu = page.getByRole("menu", { name: "Department column menu" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Filter Department" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Auto size Department" })).toBeVisible();
  await expectOverlayInViewport(page, ".og-grid__column-menu");

  await menu.getByRole("menuitem", { name: "Filter Department" }).click();
  await expect(page.getByRole("dialog", { name: "Filter Department" })).toBeVisible();
  await page.getByLabel("Public Works").uncheck();
  await page.getByLabel("Digital").uncheck();
  await page.getByLabel("Apply Department filter").click();

  await expect(page.getByRole("grid")).toContainText("Rows: 3");
  await expect(summaryValue(page, "Filter model")).toHaveText("department:in:Finance");
});

test("menus example runs cell and row context menu actions", async ({ page }) => {
  await page.goto("/#F-MENU");

  await cell(page, "MENU-0002", "service").click({ button: "right" });
  const menu = page.getByRole("menu", { name: "Context menu" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Copy cell" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Copy row", exact: true })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Start edit" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Flag row for review" })).toBeVisible();
  await expectOverlayInViewport(page, ".og-grid__context-menu");

  await menu.getByRole("menuitem", { name: "Flag row for review" }).click();
  await expect(summaryValue(page, "Last menu action")).toHaveText("Flag row for review");
  await expect(summaryValue(page, "Context row")).toHaveText("MENU-0002");
  await expect(summaryValue(page, "Context field")).toHaveText("service");
});

test("menus example supports keyboard context menus and edit start", async ({ page }) => {
  await page.goto("/#F-MENU");

  await cell(page, "MENU-0002", "service").click();
  await page.keyboard.press("Shift+F10");
  const keyboardMenu = page.getByRole("menu", { name: "Context menu" });
  await expect(keyboardMenu).toBeVisible();
  await expect(keyboardMenu.getByRole("menuitem", { name: "Copy cell" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(keyboardMenu.getByRole("menuitem", { name: "Mark row ready" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(keyboardMenu.getByRole("menuitem", { name: "Flag row for review" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(summaryValue(page, "Last menu action")).toHaveText("Flag row for review");

  await cell(page, "MENU-0002", "service").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Start edit" }).click();
  await expect(page.getByRole("dialog", { name: "Edit Service" })).toBeVisible();
  await expect(page.locator('input[aria-label="Edit Service"]')).toBeFocused();
});

function cell(page: Page, rowKey: string, field: string) {
  return page.locator(`[data-edit-row-key="${rowKey}"][data-field="${field}"]`).first();
}

function summaryValue(page: Page, label: string) {
  return page
    .getByLabel("Menu summary")
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd[1]");
}

async function expectOverlayInViewport(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!box || !viewport) return;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}
