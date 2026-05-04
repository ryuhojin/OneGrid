import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper.js";

test("react wrapper grid keeps shared ARIA semantics @a11y", async ({ page }) => {
  await page.goto("/react.html");

  const grid = page.getByRole("grid", { name: "React wrapper grid" });
  await expect(grid).toBeVisible();
  await expect(grid).toContainText("WR-0001");
  await expectNoAxeViolations(page, '[role="grid"][aria-label="React wrapper grid"]');
});
