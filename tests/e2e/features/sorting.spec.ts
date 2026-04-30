import { expect, test } from "@playwright/test";

test("sorting example cycles header sort state and reorders client rows", async ({ page }) => {
  await page.goto("/#F-SORT");

  const amountHeader = page.locator('[role="columnheader"][data-source-id="amount"]');
  await amountHeader.click();

  await expect(amountHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(page.locator('[data-layout-section="body"] [data-column-id="id"]').first())
    .toHaveText("SO-0003");
  await expect(page.getByLabel("Sorting summary")).toContainText("amount:asc");

  await amountHeader.click();
  await expect(amountHeader).toHaveAttribute("aria-sort", "descending");
  await expect(page.locator('[data-layout-section="body"] [data-column-id="id"]').first())
    .toHaveText("SO-0004");

  await amountHeader.click();
  await expect(amountHeader).toHaveAttribute("aria-sort", "none");
  await expect(page.getByLabel("Sorting summary")).toContainText("none");
});

test("sorting example supports custom comparator and multi sort priority", async ({ page }) => {
  await page.goto("/#F-SORT");

  const amountHeader = page.locator('[role="columnheader"][data-source-id="amount"]');
  const statusHeader = page.locator('[role="columnheader"][data-source-id="status"]');

  await statusHeader.click();
  await expect(statusHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(page.locator('[data-layout-section="body"] [data-column-id="id"]').first())
    .toHaveText("SO-0003");
  await expect(page.locator('[data-layout-section="body"] [data-column-id="id"]').nth(1))
    .toHaveText("SO-0006");

  await amountHeader.click();
  await statusHeader.click({ modifiers: ["Shift"] });
  await expect(page.getByLabel("Sorting summary")).toContainText("amount:asc, status:asc");
  await expect(statusHeader.locator(".og-grid__sort-priority")).toHaveText("2");
});
