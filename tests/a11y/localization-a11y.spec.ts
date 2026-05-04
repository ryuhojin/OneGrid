import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper.js";

test("localization grid exposes localized visible text without a11y violations @a11y", async ({ page }) => {
  await page.goto("/#F-I18N");

  await page.getByRole("button", { name: "한국어" }).click();
  const grid = page.getByRole("grid", { name: "Localization grid" });
  await expect(grid).toContainText("행: 3");
  await expect(grid).toContainText("준비");
  await expectNoAxeViolations(page, '[role="grid"][aria-label="Localization grid"]');
});
