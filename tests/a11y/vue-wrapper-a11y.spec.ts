import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper.js";

test("vue wrapper grid keeps shared ARIA semantics @a11y", async ({ page }) => {
  await page.goto("/vue.html");

  const grid = page.getByRole("grid", { name: "Vue wrapper grid" });
  await expect(grid).toBeVisible();
  await expect(grid).toContainText("WV-0001");
  await expectNoAxeViolations(page, '[role="grid"][aria-label="Vue wrapper grid"]');
});
