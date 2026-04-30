import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("sorting headers expose aria-sort and keyboard toggle @a11y", async ({ page }) => {
  await page.goto("/#F-SORT");

  const amountHeader = page.locator('[role="columnheader"][data-source-id="amount"]');
  await amountHeader.focus();
  await expect(amountHeader).toBeFocused();
  await expect(amountHeader).toHaveAttribute("aria-sort", "none");

  await page.keyboard.press("Enter");
  await expect(amountHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(page.getByLabel("Sorting summary")).toContainText("amount:asc");

  await page.keyboard.press(" ");
  await expect(amountHeader).toHaveAttribute("aria-sort", "descending");
});

test("sorting example passes axe-core scan @a11y", async ({ page }) => {
  await page.goto("/#F-SORT");

  await expectNoAxeViolations(page, '[role="grid"]');
});
