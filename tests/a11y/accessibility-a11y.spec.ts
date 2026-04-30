import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("accessibility example exposes grid semantics and live region @a11y", async ({ page }) => {
  await page.goto("/#DOM-003");

  const grid = page.getByRole("grid", { name: "Accessibility contract grid" });
  await expect(grid).toHaveAttribute("aria-rowcount", "6");
  await expect(grid).toHaveAttribute("aria-colcount", "5");
  await expect(grid).toHaveAttribute("aria-readonly", "true");
  await expect(grid).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".og-grid__live-region")).toHaveText(
    "Grid ready. 6 rows and 5 columns."
  );

  await expect(grid.locator('[data-layout-section="header"] [role="row"]').first())
    .toHaveAttribute("aria-rowindex", "1");
  await expect(grid.getByRole("columnheader", { name: "Department" }))
    .toHaveAttribute("aria-colindex", "2");
  await expect(grid.getByRole("gridcell", { name: "AX-0001" }))
    .toHaveAttribute("aria-colindex", "1");
  await expect(page.getByRole("gridcell", { name: "Finance" }))
    .toHaveAttribute("aria-rowspan", "2");
});

test("virtual rows expose logical aria-rowindex while DOM rows stay bounded @a11y", async ({ page }) => {
  await page.goto("/#LAY-002");

  const viewport = page.locator('[data-layout-viewport="body"]');
  const bodyRows = page.locator('[data-layout-section="body"] [data-layout-pane="center"] [data-row-key]');
  await viewport.evaluate((element) => {
    element.scrollTop = 8_000;
    element.dispatchEvent(new Event("scroll"));
  });

  await expect.poll(async () =>
    Number(await bodyRows.first().getAttribute("aria-rowindex"))
  ).toBeGreaterThan(1);
  await expect.poll(async () => bodyRows.count()).toBeLessThanOrEqual(64);
});

test("column menu exposes ARIA menu semantics and trapped keyboard focus @a11y", async ({ page }) => {
  await page.goto("/#DOM-003");

  await page.getByRole("gridcell", { name: "AX-0001" }).click();
  await expect(page.locator('[data-focus-active="true"]')).toHaveText("AX-0001");

  const menuButton = page.getByLabel("Column menu Department");
  const menuId = await menuButton.getAttribute("aria-controls");
  expect(menuId).toMatch(/^og-column-menu-/);
  await expect(menuButton).toHaveAttribute("aria-haspopup", "menu");

  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('[data-focus-active="true"]')).toHaveCount(0);

  const menu = page.locator(`#${menuId}`);
  await expect(menu).toHaveAttribute("role", "menu");
  await expect(menu.getByRole("menuitem", { name: "Hide Department" })).toBeVisible();
  await expect(menu.getByRole("menuitem").first()).toBeFocused();

  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitem").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(menu.getByRole("menuitem").last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(menuButton).toBeFocused();
});

test("accessibility example passes axe-core scan @a11y", async ({ page }) => {
  await page.goto("/#DOM-003");

  await expectNoAxeViolations(page, '[role="grid"]');
});
