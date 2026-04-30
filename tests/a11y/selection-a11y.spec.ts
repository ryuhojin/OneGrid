import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("selection controls expose checkbox and toolbar semantics @a11y", async ({ page }) => {
  await page.goto("/#F-SELECT");

  await expect(page.getByLabel("Select row SEL-0001")).toBeVisible();
  await page.getByLabel("Select row SEL-0001").check();
  await expect(page.locator('[data-edit-row-key="SEL-0001"][data-field="id"]').first())
    .toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Select all visible" })).toBeVisible();
});

test("selection example passes axe-core scan @a11y", async ({ page }) => {
  await page.goto("/#F-SELECT");
  await expect(page.getByLabel("Select row SEL-0001")).toBeVisible();

  await expectNoAxeViolations(page, '[role="grid"]');
});
