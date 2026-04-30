import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("clipboard controls are keyboard reachable and labelled @a11y", async ({ page }) => {
  await page.goto("/#F-CLIP");

  await expect(page.getByRole("button", { name: "Copy selected" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy with headers" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Paste sample" })).toBeVisible();
  await page.getByRole("button", { name: "Copy with headers" }).focus();
  await expect(page.getByRole("button", { name: "Copy with headers" })).toBeFocused();
});

test("clipboard example passes axe-core scan @a11y", async ({ page }) => {
  await page.goto("/#F-CLIP");
  await expect(page.getByRole("button", { name: "Copy selected" })).toBeVisible();

  await expectNoAxeViolations(page, '[role="grid"]');
});
