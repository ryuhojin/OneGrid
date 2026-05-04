import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper.js";

test("xss defense example keeps grid semantics accessible @a11y", async ({ page }) => {
  await page.goto("/#SEC-002");

  await expect(page.getByRole("grid")).toContainText("XSS-001");
  await expect(page.getByLabel("XSS defense summary")).toContainText("XSS fired");
  await expectNoAxeViolations(page, "#SEC-002");
});
