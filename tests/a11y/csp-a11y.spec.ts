import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper.js";

test("CSP example has no accessibility violations @a11y", async ({ page }) => {
  await page.goto("/#SEC-001");

  const grid = page.getByRole("grid", { name: "CSP locked grid" });
  await expect(grid).toContainText("CSP-0001");
  await expectNoAxeViolations(page, '[role="grid"][aria-label="CSP locked grid"]');
});
