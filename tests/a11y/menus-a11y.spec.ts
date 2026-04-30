import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("menu example exposes labelled header and context menus @a11y", async ({ page }) => {
  await page.goto("/#F-MENU");

  const headerButton = page.getByLabel("Column menu Status");
  await expect(headerButton).toHaveAttribute("aria-haspopup", "menu");
  await headerButton.click();
  const headerMenu = page.getByRole("menu", { name: "Status column menu" });
  await expect(headerMenu).toBeVisible();
  await expect(headerMenu.getByRole("menuitem", { name: "Filter Status" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(headerButton).toBeFocused();

  await page.locator('[data-edit-row-key="MENU-0002"][data-field="service"]').click();
  await page.keyboard.press("Shift+F10");
  const contextMenu = page.getByRole("menu", { name: "Context menu" });
  await expect(contextMenu).toBeVisible();
  await expect(contextMenu.getByRole("menuitem", { name: "Copy cell" })).toBeFocused();
  await expect(contextMenu.getByRole("menuitem", { name: "Flag row for review" })).toBeVisible();
});

test("menu overlays pass axe-core scans @a11y", async ({ page }) => {
  await page.goto("/#F-MENU");

  await expectNoAxeViolations(page, '[role="grid"]');

  await page.getByLabel("Column menu Department").click();
  await expect(page.getByRole("menu", { name: "Department column menu" })).toBeVisible();
  await expectNoAxeViolations(page, ".og-grid__column-menu");

  await page.keyboard.press("Escape");
  await page.locator('[data-edit-row-key="MENU-0002"][data-field="service"]').click({ button: "right" });
  await expect(page.getByRole("menu", { name: "Context menu" })).toBeVisible();
  await expectNoAxeViolations(page, ".og-grid__context-menu");
});
