import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("pivot grid exposes generated headers and panel semantics @a11y", async ({ page }) => {
  await page.goto("/#F-PIVOT");

  const grid = page.getByRole("grid", { name: "Client pivot grid" });
  await expect(grid).toHaveAttribute("aria-colcount", "8");
  await expect(grid.getByRole("columnheader", { name: "Q1" })).toBeVisible();

  const button = page.getByRole("button", { name: "Pivot" }).first();
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Pivot panel" }).first()).toBeVisible();
});

test("pivot example passes axe-core scans @a11y", async ({ page }) => {
  await page.goto("/#F-PIVOT");

  await expectNoAxeViolations(page, '[role="grid"][aria-label="Client pivot grid"]');
  await expectNoAxeViolations(page, '[role="grid"][aria-label="Server pivot grid"]');
});
