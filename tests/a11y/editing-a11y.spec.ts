import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("editing overlay exposes dialog, control, and validation alert semantics @a11y", async ({ page }) => {
  await page.goto("/#F-EDIT");

  await page.locator('[data-field="title"][data-edit-row-key="ED-0001"]').first().dblclick();
  await expect(page.getByRole("dialog", { name: "Edit Title" })).toBeVisible();
  const editor = page.locator('.og-grid__editor-overlay [aria-label="Edit Title"]').first();
  await expect(editor).toBeFocused();

  await editor.fill("No");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText("Title must be at least 3 characters");
});

test("editing example passes axe-core scan @a11y", async ({ page }) => {
  await page.goto("/#F-EDIT");
  await expect(page.locator('[data-field="id"][data-edit-row-key="ED-0001"]').first()).toHaveText("ED-0001");

  await expectNoAxeViolations(page, '[role="grid"]');
});
