import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("filtering controls expose search and dialog semantics @a11y", async ({ page }) => {
  await page.goto("/#F-FILTER");

  await expect(page.getByRole("search")).toBeVisible();
  await page.getByLabel("Quick filter").fill("office");
  await expect(page.getByLabel("Quick filter")).toBeFocused();

  await page.getByLabel("Column menu Status").click();
  await page.getByRole("menuitem", { name: "Filter Status" }).click();
  await expect(page.getByRole("dialog", { name: "Filter Status" })).toBeVisible();
  await expect(page.getByLabel("Approved")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Filter Status" })).toBeHidden();
});

test("filtering example passes axe-core scan @a11y", async ({ page }) => {
  await page.goto("/#F-FILTER");
  await expect(page.locator('[data-layout-section="body"] [data-column-id="id"]').first())
    .toHaveText("FL-0001");

  await expectNoAxeViolations(page, '[role="grid"]');
});
