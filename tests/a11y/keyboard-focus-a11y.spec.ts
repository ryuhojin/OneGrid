import { expect, test } from "@playwright/test";

test("keyboard focus exposes active cell through grid semantics @a11y", async ({ page }) => {
  await page.goto("/#DOM-002");

  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("data-keyboard-focus", "true");

  await grid.focus();
  await expect(page.locator('[data-focus-active="true"]')).toHaveText("KF-0001");
  await expect(grid).toHaveAttribute("aria-activedescendant", /og-cell-1-1-id/);

  await page.keyboard.press("ArrowRight");
  const active = page.locator('[data-focus-active="true"]');
  await expect(active).toHaveAttribute("aria-colindex", "2");
  await expect(active).toHaveAttribute("tabindex", "0");
  await expect(active).toBeFocused();
});
