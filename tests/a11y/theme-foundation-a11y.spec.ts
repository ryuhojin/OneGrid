import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper.js";

test("theme foundation variants keep the grid accessible @a11y", async ({ page }) => {
  await page.goto("/#THEME-001");

  await page.getByRole("button", { name: "High contrast" }).click();
  const grid = page.getByRole("grid", { name: "Theme foundation grid" });
  await expect(grid).toContainText("Rows: 6");
  await expectNoAxeViolations(page, '[role="grid"][aria-label="Theme foundation grid"]');
});
