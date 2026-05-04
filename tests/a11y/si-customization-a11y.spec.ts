import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper.js";

test("SI customization keeps themed controls and grid accessible @a11y", async ({ page }) => {
  await page.goto("/#THEME-002");

  await page.getByRole("button", { name: "BNK gold" }).click();
  const grid = page.getByRole("grid", { name: "SI customization grid" });
  await expect(grid).toContainText("Rows: 6");
  await expectNoAxeViolations(page, "#THEME-002");
});
