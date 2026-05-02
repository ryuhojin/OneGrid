import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("export import example has no critical accessibility violations", async ({ page }) => {
  await page.goto("/#F-EXPORT");

  await expect(page.getByRole("grid", { name: "Export import grid" })).toBeVisible();
  await expectNoAxeViolations(page, "#F-EXPORT");
});
